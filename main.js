import BLESensorCard from "./components/card.js";
import { fetchAll, displayError } from "./util.js";

async function run() {    
    try {
        await BLESensorCard.register();
        let cards = document.getElementById("cards");        
        let devices = await fetchAll();
        
        devices.forEach(d => {
            let card = BLESensorCard.create(d.name);
            cards.appendChild(card);
        });
        
    } catch (err) {
        displayError(err.message);
    }
}

export default run;
