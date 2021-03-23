const elementName = "ble-sensor-graph";
const defaultPort = "5000";
const defaultMarginX = 40;
const defaultMarginY = 30;
const hour = 3600 * 1000;
const day = hour * 24;
const week = day * 7;
const month = day * 31;
const year = day * 365;

class BLESensorGraph extends HTMLDivElement {
    static get observedAttributes() { 
        return ["interval", "col"];
    }

    static register() {
        let template = document.createElement("template");
        template.setAttribute("id", `${elementName}-template`);
        document.body.appendChild(template);
        template.innerHTML = templateContent;        
        customElements.define(elementName, BLESensorGraph, { extends: "div" });  
    }
    
    constructor() {
        super();
        this.name = this.getAttribute("name");
        this.host = this.getAttribute("host") || document.location.hostname;
        this.port = this.getAttribute("port") || defaultPort;
        this.locale = this.getAttribute("locale") || [];
        let template = document.getElementById(`${elementName}-template`);
        let shadow = this.attachShadow({ mode: "open" });
        shadow.appendChild(template.content.cloneNode(true));
        this.shadowRoot.getElementById("graph-name").textContent = this.name;
        this.setAttribute("class", "col-auto");
        this.canvas = this.shadowRoot.getElementById("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.ctx.lineJoin = "bevel";
        this.minX = defaultMarginX;
        this.minY = defaultMarginY;
        
        let select1 = this.shadowRoot.getElementById("interval-select");

        select1.addEventListener('change', (event) => {
            this.setAttribute("interval", event.target.value);
        });
        
        let select2 = this.shadowRoot.getElementById("column-select");

        select2.addEventListener('change', (event) => {
            this.setAttribute("col", event.target.value);
        });
        
        let button = this.shadowRoot.getElementById("refresh-button");

        button.onclick = async () => {
            await this.update();
        };
        
        this.clearError();
    }
    
    async connectedCallback() {
        await this.update();
    }

    async attributeChangedCallback(name, oldValue, newValue) {
        await this.update();
    }
    
    async update() {
        try {
            if (this.shadowRoot && this.isConnected) {
                this.updateProps1();
                let dev = await this.fetch();
                
                if (dev.sensorData.length) {
                    this.shadowRoot.getElementById("graph-address").textContent = dev.address;
                    this.updateProps2(dev.sensorData);
                    this.drawGrid();
                    this.drawGraph(dev.sensorData);
                }
                         
                this.clearError();   
            }
        } catch (e) {
            this.showError(e.message);
        }
    }

    updateProps1() {
        this.maxX = this.canvas.width - this.minX;
        this.maxY = this.canvas.height - this.minY;
        this.rngX = this.maxX - this.minX;
        this.rngY = this.maxY - this.minY;
        this.updateInterval();
        this.col = this.getAttribute("col") || "temperature";
        this.unit = units[this.col];
    }

    async fetch() {
        if (!this.name || !this.host || !this.port || !this.minT || !this.maxT || !this.col) {
            throw new Error("Required props not set!");
        }
        
        let start = new Date(this.minT).toISOString();
        let end = new Date(this.maxT).toISOString();
        let res = await fetch(`http://${this.host}:${this.port}/${this.name}?start=${start}&end=${end}&columns=${this.col}`);
         
        if (res.ok) {
            return await res.json();
        } else {
            throw new Error(`${res.status} ${res.statusText}`);
        }
    }

    updateProps2(data) {
        let minV = data[0][this.col];
        let maxV = minV;
        
        data.forEach(d => {
            if (d[this.col] < minV) {
                minV = d[this.col];
            } else if (d[this.col] > maxV) {
                maxV = d[this.col];
            }
        });
        
        this.maxV = Math.ceil(maxV);
        this.minV = Math.floor(minV);
        this.rngV = this.maxV - this.minV;
        
        if (this.rngV >= 5) {
            this.stepV = Math.round(this.rngV / 5);
        } else if (this.rngV >= 1) {
            this.stepV = 1;
        } else {
            this.stepV = 0.2;
        }
    }

    updateInterval() {
        this.interval = this.getAttribute("interval") || "day";
        this.maxT = Date.now();
        
        switch (this.interval) {
            case "day":
                this.minT = Math.floor((this.maxT - day) / hour) * hour;
                this.stepT = hour * 2;
                this.timeLabelFunc = (t) => {
                    return new Date(t).toLocaleTimeString(this.locale, { hour: "2-digit", minute: "2-digit" });
                };
                break;
            case "week":
                this.minT = Math.floor((this.maxT - week) / day) * day;
                this.stepT = day;
                this.timeLabelFunc = (t) => {
                    return new Date(t).toLocaleDateString(this.locale, { month: "numeric", day: "numeric" });
                };
                break;
            case "month":
                this.minT = Math.floor((this.maxT - month) / day) * day;
                this.stepT = day * 2;
                this.timeLabelFunc = (t) => {
                    return new Date(t).toLocaleDateString(this.locale, { month: "numeric", day: "numeric" });
                };
                break;
            case "year":
                this.minT = Math.floor((this.maxT - year) / month) * month;
                this.stepT = month;
                this.timeLabelFunc = (t) => {
                    return new Date(t).toLocaleDateString(this.locale, { month: "short"});
                };
                break;
            default:
                throw new Error("Invalid interval!");
        }
        
        this.rngT = this.maxT - this.minT;       
    }    
    
    drawGrid() {
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "lightblue";
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "lightcyan";
        this.ctx.fillRect(this.minX, this.minY, this.rngX, this.rngY);
        this.ctx.beginPath();
        this.label(this.unit, this.minX / 2, this.minY / 2);
        
        for (let y = this.minV; y <= this.maxV; y += this.stepV) {
            this.hLine(y);
        }

        this.ctx.stroke();
        
        for (let x = this.minT; x <= this.maxT; x += this.stepT) {
            this.vLine(x);
        }
        
        this.ctx.stroke();
    }
    
    drawGraph(data) {
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = "lightcoral";
        this.ctx.beginPath();
        
        data.forEach(d => {
            let x = this.calculateX(Date.parse(d.time));
            let y = this.calculateY(d[this.col]);
            this.ctx.lineTo(x, y);
        });
        
        this.ctx.stroke();
    }

    calculateX(v) {
        return this.minX + ((v - this.minT) / this.rngT * this.rngX);
    }
    
    calculateY(v) {
        return this.maxY - ((v - this.minV) / this.rngV * this.rngY);
    }

    vLine(v) {
        let x = this.calculateX(v);
        this.ctx.moveTo(x, this.minY);
        this.ctx.lineTo(x, this.maxY);
        let text = this.timeLabelFunc(v);
        this.label(text, x, this.maxY + this.minY * 0.70);
    }

    hLine(v) {
        let y = this.calculateY(v);
        this.ctx.moveTo(this.minX, y);
        this.ctx.lineTo(this.maxX, y);
        this.label(v, this.minX / 2, y);
    }

    label(text, x, y) {
        let m = this.ctx.measureText(text);
        x = x - m.width / 2;
        y = y + m.actualBoundingBoxAscent / 2;
        this.ctx.fillStyle = "black";
        this.ctx.fillText(text, x, y);
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
    <link href="bootstrap/bootstrap.min.css" rel="stylesheet" integrity="sha384-giJF6kkoqNQ00vy+HMDP7azOuL0xtbfIcaT9wjKHr8RbDVddVHyTfAAsrekwKmP1">
    <div class="card text-dark bg-light">
        <div class="card-header">
            <div class="row justify-content-between">
                <div class="col-auto mb-0 text-capitalize fw-bold" id="graph-name"></div>
                <div class="col-auto mb-0 text-muted" id="graph-address"></div>
                <select class="col-auto mb-0" id="interval-select">
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                </select>
                <select class="col-auto mb-0" id="column-select">
                    <option value="temperature">Temperature</option>
                    <option value="humidity">Humidity</option>
                    <option value="pressure">Pressure</option>
                    <option value="accelerationX">Acceleration X</option>
                    <option value="accelerationY">Acceleration Y</option>
                    <option value="accelerationZ">Acceleration Z</option>
                    <option value="voltage">Voltage</option>
                    <option value="txPower">Tx Power</option>
                    <option value="movementCounter">Movement Counter</option>
                    <option value="measurementSequence">Measurement Sequence</option>
                </select>
                <button class="col-auto mb-0 btn btn-link py-0 fs-5" type="button" id="refresh-button">🔃</button>
            </div>
        </div>
        <div class="card-body px-1 py-1">
            <div class="alert alert-danger mb-0" id="error"></div>
            <canvas id="canvas" width=800 height=300></canvas>
        </div>
    </div>
`;

const units = {
    temperature: "°C",
    humidity: "%RH",
    pressure: "Pa",
    accelerationX: "g",
    accelerationY: "g",
    accelerationZ: "g",
    voltage: "V",
    txPower: "dB",
    movementCounter: "",
    measurementSequence: "",
}

BLESensorGraph.register();

export default BLESensorGraph;
