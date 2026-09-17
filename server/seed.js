require('dotenv').config();
const connectDB = require('./db');
const User = require('./models/User');
const Application = require('./models/Application');

const ACCOUNTS = [
  { name: 'Regional Passport Officer', email: 'admin@pas.gov', password: 'admin123', role: 'admin', phone: '9840000001' },
  { name: 'Verification Officer', email: 'verifier@pas.gov', password: 'verify123', role: 'verifier', phone: '9840000002' },
  { name: 'Vijay Kumar', email: 'vijay@example.com', password: 'user1234', role: 'applicant', phone: '9840000003' },
];

async function run() {
  await connectDB();
  await Promise.all([User.deleteMany({}), Application.deleteMany({})]);

  const users = [];
  for (const account of ACCOUNTS) {
    users.push(await User.create(account)); // created in sequence so hashing runs per document
  }
  const applicant = users.find((u) => u.role === 'applicant');

  const sample = new Application({
    applicant: applicant._id,
    applicationType: 'fresh',
    personal: {
      firstName: 'Vijay',
      lastName: 'Kumar',
      dob: new Date('2003-04-18'),
      gender: 'male',
      placeOfBirth: 'Chennai',
      maritalStatus: 'single',
    },
    family: { fatherName: 'Rajesh Kumar', motherName: 'Lakshmi Kumar' },
    contact: {
      phone: '9840000003',
      email: 'vijay@example.com',
      address: {
        line1: '12 Anna Salai',
        line2: 'Nandambakkam',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600089',
      },
    },
    status: 'DRAFT',
  });
  sample.pushTimeline('DRAFT', 'Application created', applicant);
  await sample.save();

  console.log('\nSeeded accounts:');
  ACCOUNTS.forEach((a) => console.log(`  ${a.role.padEnd(9)} ${a.email.padEnd(22)} ${a.password}`));
  console.log('\nOne draft application was created for the applicant account.\n');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
