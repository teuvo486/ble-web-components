import { fetchOne, registerTemplate } from "../util.js";

const TEMPLATE_ID = "ble-sensor-card-template";
const TEMPLATE_PATH = "templates/card.html";
const ELEMENT_NAME = "ble-sensor-card";

const MAX_RSSI = -22;
const MIN_RSSI = -120;
const MAX_VOLTAGE = 3.646;
const MIN_VOLTAGE = 1.6;
const UPDATE_DELAY = 8;

class BLESensorCard extends HTMLDivElement {
    static async register() {
        await registerTemplate(TEMPLATE_ID, TEMPLATE_PATH);        
        customElements.define(ELEMENT_NAME, BLESensorCard, { extends: "div" });  
    }
    
    static create(name) {
        let card = document.createElement("div", { is: ELEMENT_NAME });
        card.name = name;
        return card;
    }
    
    constructor() {
        super();
        this.setAttribute("class", "col-sm");
        this.setAttribute("style", "max-width: 22rem; min-width: 19rem;");   
        let template = document.getElementById(TEMPLATE_ID);
        let shadow = this.attachShadow({ mode: "open" });              
        shadow.appendChild(template.content.cloneNode(true));
        let button = shadow.getElementById("collapse-button");
        
        button.onclick = () => {
            this.collapse();
        };        

        this.intervalID = window.setInterval(() => {
            this.update()
                .then(_ => { })
                .catch(e => { console.log(e) });
        }, UPDATE_DELAY * 1000);
    }
    
    async update() {
        if (this.shadowRoot && this.isConnected) {
            let dev = await fetchOne(this.name);
            this.shadowRoot.getElementById("card-name").textContent = dev.name;
            this.shadowRoot.getElementById("card-address").textContent = dev.address;
            this.updRSSI(dev.rssi);
            
            if (dev.sensor_data) {
                let d = dev.sensor_data;
                this.updVoltage(d.voltage);
                this.updTime(d.time);
                this.updTemp(d.temperature);
                this.updHum(d.humidity);
                this.updDataList(d);
            }     
        } 
    }

    collapse() {
        let elem = this.shadowRoot.getElementById("collapse-element");
        elem.hidden = !(elem.hidden);
    }

    connectedCallback() {
        this.update()
            .then(_ => { })
            .catch(err => { console.log(err) });
    }

    updRSSI(val) {
        let str = "📶 ❌️";
        
        if (val) {
            let perc = Math.round((val - MIN_RSSI) / (MAX_RSSI - MIN_RSSI) * 100);
            str = `📶 ${perc} %`;
        }
        
        this.shadowRoot.getElementById("card-rssi").textContent = str;
    }

    updVoltage(val) {
        let str = "";
        
        if (val) {
            let perc = Math.round((val - MIN_VOLTAGE) / (MAX_VOLTAGE - MIN_VOLTAGE) * 100);
            str = `🔋 ${perc} %`;
        }
        
        this.shadowRoot.getElementById("card-voltage").textContent = str;
    }

    updTime(time) {
        let str = "";
        
        if (time) {
            let then = new Date(time);
            let now = new Date();
            let elapsed = (now.getTime() - then.getTime()) / 1000;
            
            if (elapsed < 60) {            
                str = `🕒 ${Math.round(elapsed)} s`;
            } else if (elapsed < 3600) {
                str = `🕒 ${Math.round(elapsed / 60)} min`;
            } else if (elapsed < 86400) {
                str = `🕒 ${Math.round(elapsed / 3600)} h`;
            } else {
                str = `🕒 ${Math.round(elapsed / 86400)} d`;
            }
        }
        
        this.shadowRoot.getElementById("card-time").textContent = str;
    }

    updTemp(val) {
        let int_str = "";
        let fract_str = "";
        
        if (val) {
            let sign = Math.sign(val);
            let rounded = Math.round(Math.abs(val) * 10) / 10;
            let int = Math.trunc(rounded);
            let fract = Math.round((rounded - int) * 10);
            
            if (sign == -1 || sign == -0) {
                int_str = `-${int}.`;
            } else {
                int_str = `${int}.`;
            }
            
            fract_str = `${fract} °C`;
        }
        
        this.shadowRoot.getElementById("temp-int").textContent = int_str;
        this.shadowRoot.getElementById("temp-fract").textContent = fract_str;
    }   
   
    updHum(val) {
        let int_str = "";
        let fract_str = "";
        
        if (val) {
            let rounded = Math.round(val * 10) / 10;
            let int = Math.trunc(rounded);
            let fract = Math.round((rounded - int) * 10);
            int_str = `${int}.`;
            fract_str = `${fract} % RH`;
        }
        
        this.shadowRoot.getElementById("hum-int").textContent = int_str;
        this.shadowRoot.getElementById("hum-fract").textContent = fract_str;
    }
    
    updDataList(d) {
        let list = this.shadowRoot.getElementById("data-list");
        
        Object.entries(d).forEach(([key, value]) => {
            let elem = this.shadowRoot.getElementById(key);
            let str = `${key}: ${value}`;
            
            if (!elem) {
                let e = document.createElement("div");
                e.setAttribute("id", key);
                e.textContent = str;
                list.appendChild(e);
            } else {
                elem.textContent = str;
            }
        });
    }
}

export default BLESensorCard;
