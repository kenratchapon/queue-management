class Machine {
    constructor(name) {
        this.name = name;
        this.status = 'available'; // or 'in use'
        this.currentCustomer = null;
        this.startTime = null;
        this.duration = null;
    }

    assignCustomer(customer, startTime, duration) {
        this.currentCustomer = customer;
        this.startTime = startTime;
        this.duration = duration;
        this.status = 'in use';
    }

    release() {
        this.currentCustomer = null;
        this.startTime = null;
        this.duration = null;
        this.status = 'available';
    }

    getStatus() {
        return {
            name: this.name,
            status: this.status,
            currentCustomer: this.currentCustomer,
            startTime: this.startTime,
            duration: this.duration,
        };
    }
}

export default Machine;