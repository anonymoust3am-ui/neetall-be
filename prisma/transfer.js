const { MongoClient } = require("mongodb");

// Full local MongoDB URL
const LOCAL_URI = "mongodb://127.0.0.1:27017/neetall";

// Full remote MongoDB URL
const REMOTE_URI =
    "mongodb://admin:happy-bird-swims-81@srv1681490.hstgr.cloud:27017/neetall?directConnection=true&authSource=admin&replicaSet=rs0&readPreference=primary";

const BATCH_SIZE = 1000;

async function transfer() {
    const localClient = new MongoClient(LOCAL_URI);
    const remoteClient = new MongoClient(REMOTE_URI);

    try {
        console.log("Connecting local MongoDB...");
        await localClient.connect();

        console.log("Connecting remote MongoDB...");
        await remoteClient.connect();

        // Database names come from the URLs
        const localDb = localClient.db();
        const remoteDb = remoteClient.db();

        const collections = await localDb.listCollections().toArray();

        console.log(`Found ${collections.length} collections`);

        for (const colInfo of collections) {
            const name = colInfo.name;

            console.log(`\nCopying collection: ${name}`);

            const localCollection = localDb.collection(name);
            const remoteCollection = remoteDb.collection(name);

            const total = await localCollection.countDocuments();

            console.log(`Documents: ${total}`);

            let batch = [];
            let copied = 0;

            const cursor = localCollection.find({});

            while (await cursor.hasNext()) {
                const doc = await cursor.next();

                batch.push(doc);

                if (batch.length >= BATCH_SIZE) {
                    try {
                        await remoteCollection.insertMany(batch, {
                            ordered: false
                        });
                    } catch (err) {
                        console.log("Batch warning:", err.message);
                    }

                    copied += batch.length;
                    console.log(`${copied}/${total}`);

                    batch = [];
                }
            }

            if (batch.length > 0) {
                try {
                    await remoteCollection.insertMany(batch, {
                        ordered: false
                    });
                } catch (err) {
                    console.log("Final batch warning:", err.message);
                }

                copied += batch.length;
            }

            console.log(`Finished ${name}: ${copied} documents`);
        }

        console.log("\nMigration completed!");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await localClient.close();
        await remoteClient.close();
    }
}

transfer();
