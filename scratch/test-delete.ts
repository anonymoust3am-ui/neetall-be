import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('Testing ChoiceList deletion cascade...');
  
  // Find a test user or create one
  let user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found, creating a test user...');
    user = await prisma.user.create({
      data: {
        firebaseUid: 'test-firebase-uid-' + Date.now(),
        phone: '1234567890-' + Date.now(),
        name: 'Test User',
      },
    });
  }

  // Create a ChoiceList
  const name = 'Test List ' + Date.now();
  console.log(`Creating choice list "${name}"...`);
  const choiceList = await prisma.choiceList.create({
    data: {
      userId: user.id,
      name,
      Caunselling: 'Test Counselling',
      ChoiceListDetails: {
        create: [
          {
            name: 'Test Item 1 ' + Date.now(),
            Caunselling: 'Test Counselling',
            Institute: 'Test Institute 1',
            Course: 'MBBS',
            Quota: 'AIQ',
            Catagory: 'UR',
          },
          {
            name: 'Test Item 2 ' + Date.now(),
            Caunselling: 'Test Counselling',
            Institute: 'Test Institute 2',
            Course: 'MBBS',
            Quota: 'AIQ',
            Catagory: 'UR',
          },
        ],
      },
    },
    include: {
      ChoiceListDetails: true,
    },
  });

  console.log('Created ChoiceList:', choiceList.id);
  console.log('Details count:', choiceList.ChoiceListDetails.length);

  // Verify they exist in database
  const detailsBefore = await prisma.choiceListDetails.findMany({
    where: { choiceListId: choiceList.id },
  });
  console.log('Details in DB before deletion:', detailsBefore.length);

  // Now delete the choiceList using Prisma Client (this triggers the onDelete: Cascade emulation)
  console.log('Deleting ChoiceList...');
  await prisma.choiceList.delete({
    where: { id: choiceList.id },
  });

  // Verify they are deleted
  const detailsAfter = await prisma.choiceListDetails.findMany({
    where: { choiceListId: choiceList.id },
  });
  console.log('Details in DB after deletion:', detailsAfter.length);
  
  if (detailsAfter.length === 0) {
    console.log('SUCCESS: Choice list details were successfully deleted!');
  } else {
    console.log('FAILURE: Choice list details were NOT deleted!');
  }

  await prisma.$disconnect();
}

test().catch((err) => {
  console.error(err);
  prisma.$disconnect();
});
