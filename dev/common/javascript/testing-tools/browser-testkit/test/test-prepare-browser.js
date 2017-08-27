//@flow
const {before, after, it, describe} = require('mocha');
const {expect} = require('chai');
const {prepareBrowser, By, eventually, setInputValue} = require('..');
const http = require('http');
const Promise = require('bluebird');

describe('prepareBrowser', function() {
  prepareBrowser(before, after);

  let server/*: ?http.Server*/;
  before((done) => {
    server = http.createServer((req, res) => {
      if (req.url === '/foo')
        res.end(`
          <script>
            function changeThis() {
                document.getElementById('check-this-out').innerHTML = 'changed!';
            }
          </script>
          <input value='this should have been changed'>
          <div id="check-this-out">This should have been changed</div>
          <button onclick="changeThis()" id="click-this">click-this</button>
              `)
      else {
        res.statusCode = 404;
        res.end();
      }
    }).listen(3000, done);
  });

  after((done) => {
    if (server) {
      server.close(done)
    }
  });

  it('should navigate to a page and allow clicking a button', Promise.coroutine(function*() {
    const browser = this.browser;

    yield browser.get('http://localhost:3000/foo');

    const button = yield browser.findElement(By.id('click-this'));
    yield button.click();
    
    return eventually(function*()/*:any*/ {
      const div = yield browser.findElement(By.id('check-this-out'));

      expect(yield div.getText()).to.equal('changed!');
    });
  }));

  it('should change the value of an input field', Promise.coroutine(function*() {
    const browser = this.browser;

    yield browser.get('http://localhost:3000/foo');

    const input = yield browser.findElement(By.tagName('input'));
    expect(yield input.getAttribute('value')).to.equal('this should have been changed');
    
    setInputValue(input, 'changed!');
    return eventually(function*()/*:any*/ {
      const input = yield browser.findElement(By.tagName('input'));

      expect(yield input.getAttribute('value')).to.equal('changed!');
    });
  }));
});
