class Customer {
    constructor(name) {
        this.name = name;
        this.assignedMachine = null;
    }

    assignMachine(machine) {
        this.assignedMachine = machine;
    }

    clearAssignment() {
        this.assignedMachine = null;
    }
}

export default Customer;