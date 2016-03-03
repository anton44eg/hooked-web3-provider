var HookedWeb3Provider = require('../build/hooked-web3-provider');
var assert = require('assert');
describe('HookedWeb3Provider', function() {
  this.timeout(5000);
  it("create provider object", function(done) {
    var provider = new HookedWeb3Provider({
      host: 'http://localhost:8545',
      transaction_signer: ''
    });
    assert.equal(typeof provider, 'object');
    done();
  });

  it('should send transaction', function (done) {
    var provider = new HookedWeb3Provider({
      host: 'http://localhost:8545',
      transaction_signer: ''
    });
    var Web3 = require('web3');
    var web3 = new Web3();
    web3.setProvider(provider);
    web3.eth.sendTransaction({
        from: '0x1b0598ec7e538deae709e8e9116bbdc43bc971dc',
        to: '0xd94440b42e32a98da08dba34884e8c35485ba551'
      },
      function (err, result) {
        console.log(err);
        console.log(result);
        done();
      }
    );
  });
});
