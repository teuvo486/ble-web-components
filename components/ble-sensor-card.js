const elementName = "ble-sensor-card";
const maxRSSI = -22;
const minRSSI = -100;
const maxVoltage = 3.646;
const minVoltage = 1.6;
const defaultPort = "5000";
const defaultDelay = 8;

class BLESensorCard extends HTMLDivElement {
    static register() {
        let template = document.createElement("template");
        template.setAttribute("id", `${elementName}-template`);
        document.body.appendChild(template);
        template.innerHTML = templateContent;        
        customElements.define(elementName, BLESensorCard, { extends: "div" });  
    }
    
    constructor() {
        super();
        
        this.name = this.getAttribute("name");
        this.host = this.getAttribute("host") || document.location.hostname;
        this.port = this.getAttribute("port") || defaultPort;
        this.delay = (this.getAttribute("delay") || defaultDelay) * 1000;
        this.setAttribute("class", "col-sm");
        this.setAttribute("style", "max-width: 22rem; min-width: 19rem;");
        
        let template = document.getElementById(`${elementName}-template`);
        this.attachShadow({ mode: "open" });              
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        let button = this.shadowRoot.getElementById("collapse-button");
        
        button.onclick = () => {
            this.collapse();
        };        
        
        this.clearError();
    }
    
    async connectedCallback() {
        await this.update();
        
        this.intervalID = window.setInterval(async () => {
           await this.update();
        }, this.delay);
    }
    
    disconnectedCallback() {
        if (this.intervalID) {
            window.clearInterval(this.intervalID);
        }
    }

    async fetch() {    
        let res = await fetch(`http://${this.host}:${this.port}/${this.name}`);
          
        if (res.ok) {
            return await res.json();
        } else {
            throw new Error(`${res.status} ${res.statusText}`);
        }
    }
    
    async update() {
        try {
            if (!this.name) {
                throw new Error("Name not set!");
            }
        
            if (this.shadowRoot && this.isConnected) {
                this.shadowRoot.getElementById("card-name").textContent = this.name;
                let dev = await this.fetch();
                this.shadowRoot.getElementById("card-address").textContent = dev.address;
                this.updRSSI(dev.rssi);
                
                if (dev.sensorData) {
                    let d = dev.sensorData;
                    this.updVoltage(d.voltage);
                    this.updTime(d.time);
                    this.updTemp(d.temperature);
                    this.updHum(d.humidity);
                    this.updDataList(d);
                }
                
                this.clearError();   
            }
        } catch (e) {
            this.showError(e.message);
        } 
    }

    collapse() {
        let elem = this.shadowRoot.getElementById("collapse-element");
        elem.hidden = !elem.hidden;
    }

    updRSSI(val) {
        let str = "📶 ❌️";
        
        if (val) {
            let perc = Math.round((val - minRSSI) / (maxRSSI - minRSSI) * 100);
            str = `📶 ${perc} %`;
        }
        
        this.shadowRoot.getElementById("card-rssi").textContent = str;
    }

    updVoltage(val) {
        let str = "";
        
        if (val) {
            let perc = Math.round((val - minVoltage) / (maxVoltage - minVoltage) * 100);
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
    
    showError(msg) {
        let error = this.shadowRoot.getElementById("error");
        error.hidden = false;
        error.textContent = msg;
    }
    
    clearError() {
        let error = this.shadowRoot.getElementById("error");
        error.hidden = true;
        error.textContent = null;
    }
}

const templateContent = `
    <link 
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.1/dist/css/bootstrap.min.css" 
        rel="stylesheet" 
        integrity="sha384-+0n0xVW2eSR5OomGNYDnhzAbDsOXxcvSN1TPprVMTNDbiYZCxYbOOl7+AMvyTG2x" 
        crossorigin="anonymous"
    >
    <div class="card text-dark bg-light">
        <div class="card-header">
            <div class="row justify-content-between">
                <div class="col-auto mb-0 text-capitalize fw-bold" id="card-name"></div>
                <div class="col-auto mb-0 text-muted" id="card-address"></div>
            </div>
            <hr class="my-2" />
            <div class="row justify-content-between">
                <div class="col-auto" id="card-rssi"></div>
                <div class="col-auto" id="card-voltage"></div>
                <div class="col-auto" id="card-time"></div>
            </div>
        </div>
        <div class="card-body py-1">
            <div class="alert alert-danger mb-0" id="error"></div>
            <div class="row justify-content-evenly">
                <div class="col-auto">
                    <span class="fs-2" id="temp-int"></span>
                    <span class="fs-5" id="temp-fract"></span>
                </div>
                <div class="col-auto">
                    <span class="fs-2" id="hum-int"></span>
                    <span class="fs-5" id="hum-fract"></span>
                </div>
            </div>
        </div>
        <div class="card-footer">
            <button class="btn btn-light btn-sm py-0 border" type="button" id="collapse-button">▼</button>
            <div id="collapse-element" hidden>
                <div class="card card-body mt-2" id="data-list">
                </div>
            </div>
        </div>
    </div>
`;

BLESensorCard.register();

export default BLESensorCard;
