# frozen_string_literal: true

# Scenario seed for Spree 6.0.6 (spree-admin-native contract fixtures).
#
#   docker compose -f infra/spree/docker-compose.yml exec spree60 bin/rails runner /seed/seed.rb
#   (scripts/spree-up.mjs runs this for you)
#
# Idempotent: scenario orders are keyed by metadata.dna_seed ("S01".."S29"),
# customers by email, the API key by name. Runs on top of `db:seed` (with
# ADMIN_EMAIL/ADMIN_PASSWORD set) and `spree:load_sample_data`.
#
# Orders are built through Spree 6's own workflows (Orders::Create ->
# payment -> Orders::Complete -> Payments/Fulfillments/Orders::Cancel), the
# same code paths the Admin API uses, so statuses are derived, not faked.
#
# Scenario (Spree 6 vocabulary: status / payment_status / fulfillment_status):
#   9 placed/paid/unfulfilled          ("paid + unfulfilled")
#   3 placed/authorized/unfulfilled    (payment authorized, not captured)
#   2 placed/none/unfulfilled          (no payment at all)
#   1 placed/partially_paid/unfulfilled
#   3 canceled/voided/canceled
#   6 placed/paid/fulfilled, 3 placed/paid/delivered  ("shipped")
#   1 placed/refunded/fulfilled         (Payment validation forbids over-paying,
#                                        so 'overcharged' cannot be seeded)
#   1 placed/partially_refunded/fulfilled
# plus one variant with exactly 2 on hand and a secret Admin API key.

ActiveRecord::Base.logger = nil
Rails.logger.level = :warn
ActionMailer::Base.perform_deliveries = false

ADMIN_EMAIL = 'admin@example.com'
PASSWORD = 'spree123'
API_KEY_NAME = 'spree-admin-native'
API_KEY_FILE = Rails.root.join('storage', '.spree-admin-native-api-key') # on the storage volume

def say(msg) = puts("[seed 6.0] #{msg}")

store = Spree::Store.default
Spree::Current.store = store if defined?(Spree::Current) && Spree::Current.respond_to?(:store=)

# --------------------------------------------------------------------- admin
admin = Spree.admin_user_class.find_by(email: ADMIN_EMAIL)
unless admin
  admin = Spree.admin_user_class.create!(email: ADMIN_EMAIL, password: PASSWORD, password_confirmation: PASSWORD,
                                         first_name: 'Spree', last_name: 'Admin')
end
admin_role = Spree::Role.default_admin_role
admin.add_role(admin_role.name, store) unless admin.spree_roles.include?(admin_role)

# ----------------------------------------------------------------- customers
NAMES = [%w[Ada Lovelace], %w[Grace Hopper], %w[Linus Torvalds], %w[Margaret Hamilton],
         %w[Ken Thompson], %w[Barbara Liskov]].freeze
customers = NAMES.each_with_index.map do |(first, last), i|
  Spree.user_class.find_or_create_by!(email: "customer#{i + 1}@example.com") do |c|
    c.first_name = first
    c.last_name = last
    c.password = PASSWORD
    c.password_confirmation = PASSWORD
  end
end

def address_for(idx)
  first, last = NAMES[idx % NAMES.size]
  { first_name: first, last_name: last, address1: "#{100 + idx} Market Street", city: 'New York',
    postal_code: '10001', country_iso: 'US', state_abbr: 'NY', phone: format('555-01%02d', idx) }
end

# ------------------------------------------------------------------- catalog
check = store.payment_methods.find_by!(type: 'Spree::PaymentMethod::Check')

orderable = Spree::SalesContext.new(store: store).orderable_variants
                               .where(is_master: false, track_inventory: true)
                               .order(:sku).to_a
raise 'sample data missing (no orderable variants)' if orderable.size < 10

low_stock_variant = orderable.first # fixed choice (lowest SKU); never ordered by this seed
orderable = orderable.drop(1)

# ---------------------------------------------------------------- scenarios
SCENARIOS = [
  *Array.new(7) { |i| [:paid_unfulfilled, 1 + i] },
  *Array.new(3) { |i| [:authorized, 2 + i * 2] },
  *Array.new(2) { |i| [:unpaid, 3 + i] },
  [:partially_paid, 4],
  *Array.new(3) { |i| [:canceled, 4 + i * 3] },
  *Array.new(6) { |i| [:fulfilled, 6 + i * 2] },
  *Array.new(3) { |i| [:delivered, 12 + i * 3] },
  [:refunded, 5],
  [:partially_refunded, 20],
  *Array.new(2) { |i| [:paid_unfulfilled, 9 + i] }
].freeze

def ok!(result, what)
  raise "#{what} failed: #{result.error.inspect}" unless result.success?

  result.value
end

def process_payment!(payment, action)
  ok!(Spree::Payments::Process.call(payment: payment, action: action), "payment #{action}")
end

rng = Random.new(60)
created = 0

SCENARIOS.each_with_index do |(kind, days_ago), i|
  key = format('S%02d', i + 1)
  picks = orderable.shuffle(random: rng).first(1 + rng.rand(3))
  quantities = picks.map { 1 + rng.rand(2) }
  next if Spree::Order.where("metadata->>'dna_seed' = ?", key).exists?

  customer = customers[i % customers.size]
  ApplicationRecord.transaction do
    order = ok!(Spree.order_create_service.call(
      store: store, customer: customer, created_by: admin,
      params: {
        email: customer.email, currency: store.default_currency, use_shipping: true,
        shipping_address: address_for(i), metadata: { dna_seed: key },
        items: picks.zip(quantities).map { |v, q| { variant_id: v.prefixed_id, quantity: q } }
      }
    ), "order #{key} create")

    payment_pending = %i[authorized unpaid partially_paid].include?(kind)
    unless kind == :unpaid
      amount = case kind
               when :partially_paid then (order.total / 2).round(2)
               else order.total
               end
      order.payments.create!(amount: amount, payment_method: check)
    end

    ok!(Spree.order_complete_workflow.call(order: order, payment_pending: payment_pending, notify_customer: false),
        "order #{key} complete")
    order.reload
    payment = order.payments.valid.first

    case kind
    when :authorized
      process_payment!(payment, :authorize)
    when :partially_paid
      process_payment!(payment, :purchase)
    when :canceled
      ok!(Spree.order_cancel_workflow.call(order: order, canceler: admin, note: 'Customer changed their mind',
                                           refund_payments: true, notify_customer: false), "order #{key} cancel")
    when :fulfilled, :delivered, :partially_refunded, :refunded
      order.fulfillments.each do |f|
        ok!(Spree.fulfillment_fulfill_workflow.call(fulfillment: f, tracking: "1Z999AA1#{format('%010d', i * 7919)}",
                                                    tracking_carrier: 'ups', notify_customer: false),
            "order #{key} fulfill")
        next unless kind == :delivered

        ok!(Spree.fulfillment_mark_delivered_workflow.call(fulfillment: f.reload, notify_customer: false),
            "order #{key} deliver")
      end
      if %i[partially_refunded refunded].include?(kind)
        ok!(Spree::Refunds::Create.call(payment: payment.reload, amount: kind == :refunded ? payment.amount : 10,
                                        reason: Spree::RefundReason.first, refunder: admin), "order #{key} refund")
      end
    end

    order.reload.update_statuses!
    ts = days_ago.days.ago.change(hour: 9 + (i % 9), min: (i * 7) % 60)
    order.update_columns(completed_at: ts, created_at: ts - 20.minutes, updated_at: ts)
  end
  created += 1
end
say "orders created this run: #{created}"

# ----------------------------------------------------------------- low stock
low_stock_variant.stock_items.each_with_index do |level, idx|
  target = idx.zero? ? 2 : 0
  if level.respond_to?(:set_count_on_hand)
    level.set_count_on_hand(target)
  else
    level.update!(count_on_hand: target)
  end
end

# ----------------------------------------------------------------- API keys
token = File.exist?(API_KEY_FILE) ? File.read(API_KEY_FILE).strip : nil
key = token.present? && Spree::ApiKey.find_by_secret_token(token)
unless key
  Spree::ApiKey.transaction do
    store.api_keys.active.where(name: API_KEY_NAME).find_each(&:revoke!)
    key = store.api_keys.create!(name: API_KEY_NAME, key_type: 'secret', scopes: %w[read_all write_all])
  end
  token = key.plaintext_token
  File.write(API_KEY_FILE, token)
end
publishable = store.api_keys.active.publishable.first ||
              store.api_keys.create!(name: 'Default', key_type: 'publishable')

# ------------------------------------------------------------------- summary
placed = Spree::Order.complete
say "complete orders: #{placed.count}"
say "  by status:             #{placed.group(:status).count.sort.to_h}"
say "  by payment_status:     #{placed.group(:payment_status).count.sort.to_h}"
say "  by fulfillment_status: #{placed.group(:fulfillment_status).count.sort.to_h}"
say "  paid+unfulfilled: #{placed.where(status: 'placed', payment_status: 'paid', fulfillment_status: 'unfulfilled').count}"
say "low-stock variant: #{low_stock_variant.sku} total_on_hand=#{low_stock_variant.reload.total_on_hand}"
say "admin: #{ADMIN_EMAIL} / #{PASSWORD} (roles: #{admin.spree_roles.pluck(:name).join(',')})"
puts "SPREE60_SECRET_API_KEY=#{token}"
puts "SPREE60_SECRET_API_KEY_SCOPES=#{key.scopes.join(',')}"
puts "SPREE60_PUBLISHABLE_API_KEY=#{publishable.plaintext_token}"
