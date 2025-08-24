export async function seed(): Promise<void> {
  console.log('Seeding demo data');
}

if (require.main === module) {
  seed();
}
