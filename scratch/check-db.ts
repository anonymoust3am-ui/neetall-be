import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('--- Checking ChoiceList and ChoiceListDetails in DB ---');

  const choiceLists = await prisma.choiceList.findMany({
    take: 5,
  });
  console.log('Sample ChoiceLists:', JSON.stringify(choiceLists, null, 2));

  const details = await prisma.choiceListDetails.findMany({
    take: 5,
  });
  console.log('Sample ChoiceListDetails:', JSON.stringify(details, null, 2));

  // Find if there are any orphaned details (whose choiceListId doesn't match any ChoiceList)
  const allDetails = await prisma.choiceListDetails.findMany({
    select: { id: true, name: true, choiceListId: true },
  });
  
  const allLists = await prisma.choiceList.findMany({
    select: { id: true },
  });
  const listIds = new Set(allLists.map(l => l.id));

  const orphaned = allDetails.filter(d => !listIds.has(d.choiceListId));
  console.log(`Total details: ${allDetails.length}`);
  console.log(`Total choice lists: ${allLists.length}`);
  console.log(`Orphaned details count: ${orphaned.length}`);
  if (orphaned.length > 0) {
    console.log('Sample orphaned details:', orphaned.slice(0, 5));
  }

  await prisma.$disconnect();
}

check().catch(console.error);
