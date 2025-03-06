class Queue {
    constructor() {
        this.customers = [];
    }

    addCustomer(customer) {
        this.customers.push(customer);
    }

    removeCustomer(customerName) {
        this.customers = this.customers.filter(customer => customer.name !== customerName);
    }

    getQueue() {
        return this.customers;
    }

    assignCustomerToMachine(customerName, machine) {
        const customer = this.customers.find(c => c.name === customerName);
        if (customer) {
            customer.assignedMachine = machine;
        }
    }
}

export default Queue;