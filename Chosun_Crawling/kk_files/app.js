if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, 'includes', {
        value: function(searchElement, fromIndex) {

            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }

            // 1. Let O be ? ToObject(this value).
            var o = Object(this);

            // 2. Let len be ? ToLength(? Get(O, "length")).
            var len = o.length >>> 0;

            // 3. If len is 0, return false.
            if (len === 0) {
                return false;
            }

            // 4. Let n be ? ToInteger(fromIndex).
            //    (If fromIndex is undefined, this step produces the value 0.)
            var n = fromIndex | 0;

            // 5. If n ≥ 0, then
            //  a. Let k be n.
            // 6. Else n < 0,
            //  a. Let k be len + n.
            //  b. If k < 0, let k be 0.
            var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

            function sameValueZero(x, y) {
                return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
            }

            // 7. Repeat, while k < len
            while (k < len) {
                // a. Let elementK be the result of ? Get(O, ! ToString(k)).
                // b. If SameValueZero(searchElement, elementK) is true, return true.
                if (sameValueZero(o[k], searchElement)) {
                    return true;
                }
                // c. Increase k by 1.
                k++;
            }

            // 8. Return false
            return false;
        }
    });
}

var formatNumber = function(num, format) {
    if (num && num.toString()) {
        var array = num.toString().split('');
        var index = -3;

        if (!format) {
            format = ',';
        }

        while (array.length + index > 0) {
            array.splice(index, 0, format);
            // Decrement by 4 since we just added another unit to the array.
            index -= 4;
        }

        return array.join('');
    } else {
        return 0;
    }
};

var checkNameForm = function(name) {
    var nameRegExp = /^[a-zA-Z \u3131-\uD79D]+$/;
    return nameRegExp.test(String(name));
}

var checkEmailForm = function(email) {
    var emailRegExp = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;
    return emailRegExp.test(String(email).toLowerCase());
}

var checkPasswordForm = function(password) {
    var passwordRegExp = /^(?=.*[0-9])[a-zA-Z0-9!@#$%^&*]/;
    return passwordRegExp.test(String(password));
}

var checkMobileForm = function(mobile) {
    var mobileRegExp = /^\d+$/;
    return mobileRegExp.test(String(mobile));
}

var checkMobileLength = function(mobile) {
    var format = false;
    if (mobile.length == 10) {
        format = true;
    } else if (mobile.length == 11) {
        format = true;
    }
    return format;
}

var checkStringByte = function(string) {
    return encodeURI(string).split(/%..|./).length - 1;
}

var lpad = function(str, padString, length) {
    while (str.length < length)
        str = padString + str;
    return str;
}

var getFormData = function($form){
    var unindexed_array = $form.serializeArray();
    var indexed_array = {};

    $.map(unindexed_array, function(n, i){
        indexed_array[n['name']] = n['value'];
    });

    return indexed_array;
}

var hideModal = function() {
    if ($(".modal.in").length) {
        $(".modal.in").modal('hide');
    };
}

var isMobileSize = function() {
    return $("body").width() < 768;
}