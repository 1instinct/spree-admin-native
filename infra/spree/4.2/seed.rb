# frozen_string_literal: true

# Scenario seed for Spree 4.2.7 (spree-admin-native contract fixtures).
#
#   docker compose -f infra/spree/docker-compose.yml exec spree42 bin/rails runner /seed/seed.rb
#   (scripts/spree-up.mjs runs this for you)
#
# Idempotent: every record is keyed (emails, fixed order numbers, app name), so
# re-running only fills in what is missing. Runs on top of Spree's default
# seeds + spree_sample, which the image entrypoint loads on first boot.
#
# Creates:
#   * admin@example.com / spree123 with the admin role and a v1 API key
#   * 6 customers (customer1..6@example.com / spree123)
#   * 29 complete scenario orders R4200000NN (plus spree_sample's 2):
#       7 paid + shipment ready, 4 balance_due (payment pending), 2 failed payment,
#       3 canceled, 9 shipped, 2 credit_owed (over-captured), 2 more paid+ready
#   * one variant with exactly 2 on hand
#   * a Doorkeeper OAuth application "spree-admin-native" (scopes: read write admin)

ActiveRecord::Base.logger = nil
Rails.logger.level = :warn
# Order-confirmation and shipment mails are rendered by ActiveJob. With the
# default :async adapter several job threads compile Sprockets/SassC assets at
# once and libsass segfaults; :inline renders them one at a time.
ActiveJob::Base.queue_adapter = :inline
ActionMailer::Base.perform_deliveries = false

ADMIN_EMAIL = 'admin@example.com'
PASSWORD = 'spree123'
ORDER_PREFIX = 'R4200000'
OAUTH_APP_NAME = 'spree-admin-native'

def say(msg)
  puts "[seed 4.2] #{msg}"
end

store = Spree::Store.default
usa = Spree::Country.find_by!(iso: 'US')
ny = usa.states.find_by!(abbr: 'NY')

# --------------------------------------------------------------------- admin
admin_role = Spree::Role.find_or_create_by!(name: 'admin')
admin = Spree::User.find_or_initialize_by(email: ADMIN_EMAIL)
if admin.new_record?
  admin.password = PASSWORD
  admin.password_confirmation = PASSWORD
  admin.save!
end
admin.spree_roles << admin_role unless admin.spree_roles.include?(admin_role)
admin.generate_spree_api_key! if admin.spree_api_key.blank?

# ----------------------------------------------------------------- customers
FIRST_NAMES = %w[Ada Grace Linus Margaret Ken Barbara].freeze
LAST_NAMES = %w[Lovelace Hopper Torvalds Hamilton Thompson Liskov].freeze
customers = (1..6).map do |i|
  user = Spree::User.find_or_initialize_by(email: "customer#{i}@example.com")
  if user.new_record?
    user.password = PASSWORD
    user.password_confirmation = PASSWORD
    user.save!
  end
  user
end

def address_for(user, idx, usa, ny)
  Spree::Address.new(
    firstname: FIRST_NAMES[idx % 6], lastname: LAST_NAMES[idx % 6],
    address1: "#{100 + idx} Market Street", city: 'New York', zipcode: '10001',
    phone: "555-01#{format('%02d', idx)}", country: usa, state: ny
  )
end

# ------------------------------------------------------------------ catalog
check = Spree::PaymentMethod::Check.where(active: true).first ||
        Spree::PaymentMethod::Check.create!(name: 'Check', active: true, display_on: 'both', stores: [store])

variants = Spree::Variant.joins(:product).where(is_master: false, track_inventory: true)
                         .where(spree_products: { deleted_at: nil }).order(:sku).to_a
raise 'spree_sample data missing (no variants)' if variants.size < 10

low_stock_variant = variants.first # fixed choice (lowest SKU); never ordered by this seed
orderable = variants.drop(1)

# --------------------------------------------------------------- scenarios
# [kind, days_ago]. Order N gets kind SCENARIOS[N-1].
SCENARIOS = [
  *Array.new(7) { |i| [:paid_ready, 1 + i] },
  *Array.new(4) { |i| [:balance_due, 2 + i * 2] },
  *Array.new(2) { |i| [:failed, 3 + i] },
  *Array.new(3) { |i| [:canceled, 4 + i * 3] },
  *Array.new(9) { |i| [:shipped, 6 + i * 2] },
  *Array.new(2) { |i| [:credit_owed, 5 + i] },
  *Array.new(2) { |i| [:paid_ready, 9 + i] }
].freeze

rng = Random.new(42)

def complete_checkout!(order)
  guard = 0
  until order.state == 'payment'
    order.next!
    guard += 1
    raise "checkout stuck in #{order.state} for #{order.number}" if guard > 5
  end
end

created = 0
SCENARIOS.each_with_index do |(kind, days_ago), i|
  number = format('%s%02d', ORDER_PREFIX, i + 1)
  existing = Spree::Order.find_by(number: number)
  if existing&.completed?
    next
  elsif existing
    existing.destroy! # half-built by an interrupted run
  end

  # One transaction per order: an interrupted run never leaves a completed
  # order whose scenario step (capture, ship, cancel) did not happen.
  ActiveRecord::Base.transaction do
    user = customers[i % customers.size]
    order = Spree::Order.create!(number: number, email: user.email, user: user, store: store,
                                 currency: store.default_currency || 'USD')

    picks = orderable.shuffle(random: rng).select { |v| v.can_supply?(2) }.first(1 + rng.rand(3))
    picks.each do |variant|
      Spree::Dependencies.cart_add_item_service.constantize.call(order: order, variant: variant,
                                                                 quantity: 1 + rng.rand(2))
    end
    order.reload

    order.bill_address = address_for(user, i, usa, ny)
    order.ship_address = address_for(user, i, usa, ny)
    order.save!
    order.next! # cart -> address
    complete_checkout!(order) # -> delivery -> payment

    amount = kind == :credit_owed ? order.total + 15 : order.total
    payment = order.payments.create!(payment_method: check, amount: amount)
    order.next! until order.completed?

    order.reload
    payment.reload
    case kind
    when :paid_ready, :credit_owed
      payment.capture!
    when :balance_due
      payment.authorize! # Check "authorizes" instantly: payment pending, nothing captured
    when :failed
      payment.started_processing!
      payment.failure!
    when :canceled
      payment.capture!
      order.reload.canceled_by(admin)
    when :shipped
      payment.capture!
      order.reload.shipments.each { |s| s.reload.ship! if s.ready? }
    end
    order.reload.update_with_updater!

    ts = days_ago.days.ago.change(hour: 9 + (i % 9), min: (i * 7) % 60)
    order.update_columns(completed_at: ts, created_at: ts - 20.minutes, updated_at: ts)
  end
  created += 1
end
say "orders created this run: #{created}"

# ---------------------------------------------------------------- low stock
low_stock_variant.stock_items.each_with_index do |si, idx|
  si.set_count_on_hand(idx.zero? ? 2 : 0)
end

# --------------------------------------------------------------- OAuth app
app = Doorkeeper::Application.find_or_initialize_by(name: OAUTH_APP_NAME)
if app.new_record?
  app.scopes = 'read write admin'
  app.redirect_uri = ''
  app.confidential = true if app.respond_to?(:confidential=)
  app.save!
end

# ------------------------------------------------------------------ summary
complete = Spree::Order.complete
say "complete orders: #{complete.count}"
say "  by state:          #{complete.group(:state).count.sort.to_h}"
say "  by payment_state:  #{complete.group(:payment_state).count.sort.to_h}"
say "  by shipment_state: #{complete.group(:shipment_state).count.sort.to_h}"
say "  paid+ready (unfulfilled): #{complete.where(state: 'complete', payment_state: 'paid', shipment_state: 'ready').count}"
say "low-stock variant: #{low_stock_variant.sku} (#{low_stock_variant.descriptive_name}) " \
    "count_on_hand=#{low_stock_variant.reload.total_on_hand}"
say "admin: #{ADMIN_EMAIL} / #{PASSWORD} (roles: #{admin.spree_roles.pluck(:name).join(',')})"
puts "SPREE42_ADMIN_API_KEY=#{admin.reload.spree_api_key}"
puts "SPREE42_OAUTH_UID=#{app.uid}"
puts "SPREE42_OAUTH_SECRET=#{app.respond_to?(:plaintext_secret) && app.plaintext_secret.present? ? app.plaintext_secret : app.secret}"
puts "SPREE42_OAUTH_SCOPES=#{app.scopes}"
