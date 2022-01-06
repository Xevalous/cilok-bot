module.exports = class Database {
    create (value, name) {
        if (typeof value === 'object' && !Array.isArray(this) && name) {
            this[name] = value;
            this[name].create = this.create;
            this[name].get = this.get;
        } else if (typeof value === 'object' && Array.isArray(this)) {
            this.push({ value, create: this.create, get: this.get });
        } else if (!Array.isArray(this)) {
            this[name] = value;
        } else {
            this.push(value);
        }
        return this;
    }

    get (method) {
        let resultData = {};
        const isArr = Array.isArray(this);
        switch (typeof method) {
        case 'string':
            if (isArr) {
                resultData.index = this.findIndex((a) => a === method);
                resultData.value = this[resultData.index];
            } else {
                resultData.value = this[method];
                resultData.index = method;
            }
            break;
        case 'number':
            resultData.value = this[method];
            resultData.index = method;
            break;
        case 'function':
            if (Array.isArray(this)) {
                for (let i = 0; i < this.length; i++) {
                    if (method(this[i], i, i)) {
                        resultData = { value: this[i], index: i };
                    }
                }
            } else {
                for (let i = 0; i < Object.keys(this).length; i++) {
                    if (
                        method(
                            this[Object.keys(this)[i]],
                            Object.keys(this)[i],
                            i
                        )
                    ) {
                        resultData = {
                            value: this[Object.keys(this)[i]],
                            index: Object.keys(this)[i]
                        };
                    }
                }
            }
            break;
        }
        if (!resultData.value) return;
        return resultData;
    }
};
