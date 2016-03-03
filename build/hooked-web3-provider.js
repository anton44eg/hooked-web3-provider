'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _ethereumjsTx = require('ethereumjs-tx');

var _ethereumjsTx2 = _interopRequireDefault(_ethereumjsTx);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var factory = function factory(Web3) {
  var HookedWeb3Provider = function (_Web3$providers$HttpP) {
    _inherits(HookedWeb3Provider, _Web3$providers$HttpP);

    function HookedWeb3Provider(_ref) {
      var host = _ref.host;
      var transaction_signer = _ref.transaction_signer;

      _classCallCheck(this, HookedWeb3Provider);

      var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(HookedWeb3Provider).call(this, host));

      _this.transaction_signer = new Buffer(transaction_signer, 'hex');
      return _this;
    }

    // We can't support *all* synchronous methods because we have to call out to
    // a transaction signer. So removing the ability to serve any.


    _createClass(HookedWeb3Provider, [{
      key: 'send',
      value: function send(payload, callback) {
        var _this2 = this;

        var requests = payload;
        if (!(requests instanceof Array)) {
          requests = [requests];
        }

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = requests[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var request = _step.value;

            if (request.method == "eth_sendTransaction") {
              throw new Error("HookedWeb3Provider does not support synchronous transactions. Please provide a callback.");
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        var finishedWithRewrite = function finishedWithRewrite() {
          return _get(Object.getPrototypeOf(HookedWeb3Provider.prototype), 'send', _this2).call(_this2, payload, callback);
        };

        return this.rewritePayloads(0, requests, {}, finishedWithRewrite);
      }

      // Catch the requests at the sendAsync level, rewriting all sendTransaction
      // methods to sendRawTransaction, calling out to the transaction_signer to
      // get the data for sendRawTransaction.

    }, {
      key: 'sendAsync',
      value: function sendAsync(payload, callback) {
        var _this3 = this;

        var finishedWithRewrite = function finishedWithRewrite() {
          _get(Object.getPrototypeOf(HookedWeb3Provider.prototype), 'sendAsync', _this3).call(_this3, payload, callback);
        };

        var requests = payload;

        if (!(payload instanceof Array)) {
          requests = [payload];
        }

        this.rewritePayloads(0, requests, {}, finishedWithRewrite);
      }

      // Rewrite all eth_sendTransaction payloads in the requests array.
      // This takes care of batch requests, and updates the nonces accordingly.

    }, {
      key: 'rewritePayloads',
      value: function rewritePayloads(index, requests, session_nonces, finished) {
        var _this4 = this;

        if (index >= requests.length) {
          return finished();
        }

        var payload = requests[index];

        // Function to remove code duplication for going to the next payload
        var next = function next(err) {
          if (err != null) {
            return finished(err);
          }
          return _this4.rewritePayloads(index + 1, requests, session_nonces, finished);
        };

        // If this isn't a transaction we can modify, ignore it.
        if (payload.method != "eth_sendTransaction") {
          return next();
        }

        var tx_params = payload.params[0];
        var sender = tx_params.from;
        console.log(payload);
        console.log(tx_params);

        var tx = this.createTransaction(tx_params.to);
        payload.method = "eth_sendRawTransaction";
        payload.params = [tx.raw];
        return next();
      }
    }, {
      key: 'createTransaction',
      value: function createTransaction(address) {
        var amountWei = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
        var data = arguments[2];

        if (address.substring(0, 2) != '0x') {
          address = '0x' + address;
        }

        var isContract = false;
        if (address.length != 42) {
          if (!data || data.length < 10) {
            console.log('Invalid address');
            return null;
          } else {
            isContract = true;
          }
        }

        var gasPrice = Web3.toWei(50, 'shannon');

        var nonce = 0;
        //for (let txid of this._transactions) {
        //  var tx = this._transactions[txid];
        //  if (tx.from === this._address) {
        //    nonce++;
        //  }
        //}

        var rawTx = {
          nonce: HookedWeb3Provider.hexify(nonce),
          gasPrice: HookedWeb3Provider.hexify(Web3.toBigNumber(gasPrice).plus(1000000000).toDigits(1)),
          gasLimit: HookedWeb3Provider.hexify(1000000),
          value: HookedWeb3Provider.hexify(amountWei)
        };

        if (data) {
          rawTx.data = data;
        }

        console.dir(rawTx);
        if (!isContract) {
          rawTx.to = address;
        }
        var transaction = new _ethereumjsTx2.default(rawTx);
        transaction.sign(this.transaction_signer);
        transaction._mockTx = {
          blockNumber: null,
          confirmations: 0,
          from: this._address,
          hash: '0x' + transaction.hash().toString('hex'),
          timeStamp: new Date().getTime() / 1000,
          nonce: nonce,
          value: amountWei
        };
        if (!isContract) {
          transaction._mockTx.to = address;
        }

        return transaction;
      }
    }], [{
      key: 'hexify',
      value: function hexify(value) {
        if (typeof value === 'number' || typeof value === 'string') {
          value = Web3.toBigNumber(value);
        }

        var hex = value.toString(16);
        if (hex.length % 2) {
          hex = '0' + hex;
        }

        return hex;
      }
    }]);

    return HookedWeb3Provider;
  }(Web3.providers.HttpProvider);

  return HookedWeb3Provider;
};

if (typeof module !== 'undefined') {
  var Web3 = require("web3");
  module.exports = factory(new Web3());
} else {
  window.HookedWeb3Provider = factory(new Web3());
}