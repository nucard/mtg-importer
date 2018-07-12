const rawData = require('./data/AllSets.json');
const _ = require('lodash');
const firebase = require('firebase-admin');
const firebaseKey = require('./firebase-key.json');
const IndexingService = require('./services/indexing.service');

firebase.initializeApp({
    credential: firebase.credential.cert(firebaseKey)
});
const db = firebase.firestore();

function deleteAllCards() {
    return new Promise((resolve, reject) => {
        const cards = db
            .collection('cards')
            .get()
            .then(snapshot => {
                const batch = db.batch();

                console.log(`Deleting ${snapshot.size} cards...`);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                batch.commit().then(() => {
                    console.log(`Done deleting.`);
                    resolve();
                });
            });
    })
}

function importCards() {
    return new Promise((resolve, reject) => {
        const cards = {};

        for (const setCode of _.keys(rawData)) {
            const setCards = rawData[setCode].cards;

            for (let setCard of setCards) {
                let card = cards[setCard.name];

                // if this isn't a card we've hit before, we need to add an entry
                if (!card) {
                    const newCard = {
                        id: setCard.id,
                        name: setCard.name,
                        rarity: setCard.rarity,
                        cost: setCard.manaCost || null,
                        types: (setCard.supertypes || []).concat(setCard.types || []),
                        subtypes: setCard.subtypes || [],
                        text: setCard.text || null,
                        thumbnail: setCard.multiverseid ?
                            `http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${setCard.multiverseid}&type=card` :
                            null,
                        printings: []
                    };

                    cards[setCard.name] = newCard;
                    card = newCard;
                }

                // add the printing to the entry
                card.printings.push({
                    artist: setCard.artist,
                    flavorText: setCard.flavor || null,
                    image: setCard.multiverseid ?
                        `http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${setCard.multiverseid}&type=card` :
                        null,
                    printedIn: setCode
                });
            }
        }

        console.log(`Adding ${_.keys(cards.length)} cards...`);
        const batch = db.batch();

        const cardValues = _.values(cards);
        for (let card of cardValues) {
            const cardRef = db.collection('cards').doc();
            batch.set(cardRef, card);
        }

        batch.commit().then(nailedIt => {
            console.log('Done.');
            resolve(cardValues);
        })
    });
}

async function createSearchIndex(cards) {
    // assign cards an objectId for algolia
    for (const card of cards) {
        card.objectId = card.name.toLowerCase().replace(' ', '');
    }

    const indexingService = new IndexingService();
    await indexingService.addToIndex('cards', cards);
}

(async () => {
    await deleteAllCards();
    await createSearchIndex(await importCards());
})();
