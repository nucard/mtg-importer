const rawData = require('./data/AllSets.json');
const _ = require('lodash');
const firebase = require('firebase-admin');
const firebaseKey = require('./firebase-key.json');

firebase.initializeApp({
    credential: firebase.credential.cert(firebaseKey)
});

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

// console.log(JSON.stringify(_.values(cards)));

const db = firebase.firestore();
for (let card of _.values(cards)) {
    console.log('setting', card);
    db
        .collection('cards')
        .add(card);
    console.log('set', card.name);
} 