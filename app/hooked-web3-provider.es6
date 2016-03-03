import Tx from 'ethereumjs-tx';

var factory = function(Web3) {

  class HookedWeb3Provider extends Web3.providers.HttpProvider {
    constructor({host, transaction_signer}) {
      super(host);
      this.transaction_signer = new Buffer(transaction_signer, 'hex');
    }

    // We can't support *all* synchronous methods because we have to call out to
    // a transaction signer. So removing the ability to serve any.
    send(payload, callback) {
      var requests = payload;
      if (!(requests instanceof Array)) {
        requests = [requests];
      }

      for (var request of requests) {
        if (request.method == "eth_sendTransaction") {
          throw new Error("HookedWeb3Provider does not support synchronous transactions. Please provide a callback.")
        }
      }

      var finishedWithRewrite = () => {
        return super.send(payload, callback);
      };

      return this.rewritePayloads(0, requests, {}, finishedWithRewrite);
    }

    // Catch the requests at the sendAsync level, rewriting all sendTransaction
    // methods to sendRawTransaction, calling out to the transaction_signer to
    // get the data for sendRawTransaction.
    sendAsync(payload, callback) {
      var finishedWithRewrite = () => {
        super.sendAsync(payload, callback);
      };

      var requests = payload;

      if (!(payload instanceof Array)) {
        requests = [payload];
      }

      this.rewritePayloads(0, requests, {}, finishedWithRewrite);
    }

    // Rewrite all eth_sendTransaction payloads in the requests array.
    // This takes care of batch requests, and updates the nonces accordingly.
    rewritePayloads(index, requests, session_nonces, finished) {
      if (index >= requests.length) {
        return finished();
      }

      var payload = requests[index];

      // Function to remove code duplication for going to the next payload
      var next = (err) => {
        if (err != null) {
          return finished(err);
        }
        return this.rewritePayloads(index + 1, requests, session_nonces, finished);
      };

      // If this isn't a transaction we can modify, ignore it.
      if (payload.method != "eth_sendTransaction") {
        return next();
      }

      var tx_params = payload.params[0];
      var sender = tx_params.from;
      console.log(payload);
      console.log(tx_params);

      let tx = this.createTransaction(tx_params.to);
      payload.method = "eth_sendRawTransaction";
      payload.params = [tx.raw];
      return next();
    }

    static hexify(value) {
      if (typeof (value) === 'number' || typeof (value) === 'string') {
        value = Web3.toBigNumber(value);
      }

      var hex = value.toString(16);
      if (hex.length % 2) {
        hex = '0' + hex;
      }

      return hex;
    }

    createTransaction(address, amountWei=0, data) {
      if (address.substring(0, 2) != '0x') {
        address = '0x' + address;
      }

      var isContract = false;
      if (address.length != 42) {
        if (!data || data.length<10) {
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
      var transaction = new Tx(rawTx);
      transaction.sign(this.transaction_signer);
      transaction._mockTx = {
        blockNumber: null,
        confirmations: 0,
        from: this._address,
        hash: ('0x' + transaction.hash().toString('hex')),
        timeStamp: (new Date()).getTime() / 1000,
        nonce: nonce,
        value: amountWei
      };
      if (!isContract) {
        transaction._mockTx.to = address;
      }

      return transaction;
    }
  }

  return HookedWeb3Provider;
};

if (typeof module !== 'undefined') {
  var Web3 = require("web3");
  module.exports = factory(new Web3());
} else {
  window.HookedWeb3Provider = factory(new Web3());
}
