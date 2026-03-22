const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  customId: String,
  designation: String,
  department: String,
  mobile: String,
  image: {}
});

const User = mongoose.model('User', userSchema);

async function createTestUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://emsuser:emsuser@ems.fh5vnvq.mongodb.net/?appName=ems');

    // Check if users exist
    const managerExists = await User.findOne({ email: 'manager@test.com' });
    const employeeExists = await User.findOne({ email: 'employee@test.com' });

    if (!managerExists) {
      const hashedPassword = await bcrypt.hash('Test@123', 10);
      await User.create({
        name: 'Test Manager',
        email: 'manager@test.com',
        password: hashedPassword,
        role: 'manager',
        customId: 'MGR001',
        designation: 'Manager',
        department: 'Admin'
      });
      console.log('✓ Manager created: manager@test.com / Test@123');
    } else {
      console.log('✓ Manager already exists: manager@test.com');
    }

    if (!employeeExists) {
      const hashedPassword = await bcrypt.hash('Test@123', 10);
      await User.create({
        name: 'Test Employee',
        email: 'employee@test.com',
        password: hashedPassword,
        role: 'employee',
        customId: 'EMP001',
        designation: 'Developer',
        department: 'IT'
      });
      console.log('✓ Employee created: employee@test.com / Test@123');
    } else {
      console.log('✓ Employee already exists: employee@test.com');
    }

    mongoose.connection.close();
    console.log('\n📝 Test users ready! Use these credentials to login:');
    console.log('Manager: manager@test.com / Test@123');
    console.log('Employee: employee@test.com / Test@123');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error.message);
    process.exit(1);
  }
}

createTestUsers();
