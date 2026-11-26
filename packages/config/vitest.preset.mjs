/** Shared Vitest settings for library packages. */
export const vitestPreset = {
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    restoreMocks: true,
  },
};
