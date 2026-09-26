/**
 * Seed script - creates the initial super-admin user and default
 * CMS content so the admin-frontend and web-frontend have something
 * to display immediately after a fresh deploy.
 *
 * Usage: npm run seed
 */
require('dotenv').config();
const { connectDB } = require('./config/db');
const User = require('./models/User');
const Content = require('./models/Content');

async function seed() {
  await connectDB();

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@toppristine.com').toLowerCase();
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (!existingAdmin) {
    await User.create({
      name: process.env.SEED_ADMIN_NAME || 'Super Admin',
      email: adminEmail,
      password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
      role: 'super_admin',
      status: 'active',
    });
    console.log(`[seed] Created super admin user: ${adminEmail}`);
  } else {
    console.log(`[seed] Super admin user already exists: ${adminEmail}`);
  }

  const aboutUsDefault = {
    heading: 'About Top Pristine Luxury Craft',
    intro:
      'Top Pristine delivers high-quality architectural solutions with uncompromising attention to detail. We take pride in every creation, big or small.',
    yearsExperience: 15,
    certifications: ['Fully Licensed & Insured', 'Master Guild Craft Certified'],
    materialTags: ['Bookmatched Marble', 'Custom Brass Joinery', 'Smart Ambient Lighting'],
  };

  await Content.findOneAndUpdate(
    { page: 'about-us' },
    { $setOnInsert: { data: aboutUsDefault } },
    { upsert: true }
  );
  console.log('[seed] Ensured default "about-us" CMS content exists');

  console.log('[seed] Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
