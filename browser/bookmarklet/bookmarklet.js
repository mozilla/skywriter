(function() {
    /** --------------------------------------------------------------------
     * Load Bespin only when it's not already on the page.
     */
    if (typeof bespin == 'undefined') {
        /** Adjust the following variables as needed **/
        var base = 'http://localhost:8080/';
        var proxyFile = 'proxy.html';
        var baseConfig = {
            settings: {
                tabstop: 4,
                theme: 'white'
            }
        };

        var head = document.getElementsByTagName('head')[0];
        var iFrame;

        /** Add the bespin_base link to the header **/
        var l =  document.createElement('link');
        l.setAttribute('id', 'bespin_base');
        l.setAttribute('href', base);
        head.appendChild(l);

        /** Add some basic Bespin CSS **/
        l =  document.createElement('style');
        l.innerHTML = '.bespin{border:1px solid gray;}';
        head.appendChild(l);

        /** --------------------------------------------------------------------
         * BEGIN: Proxy handling code.
         */
        var postProxyMsg = function(obj) {
            iFrame.contentWindow.postMessage(JSON.stringify(obj), '*');
        };

        /** --------------------------------------------------------------------
         * Worker proxy implementation.
         */
        var lastWorker = 0;
        var workerList = [];

        /** Fake Worker class **/
        var WorkerProxy = function(url) {
            this.id = lastWorker ++;
            postProxyMsg({
                id: this.id,
                task: 'newWorker',
                url: url
            });
            workerList[this.id] = this;
            console.log('newWorker', url, this.id);
        };

        WorkerProxy.prototype.postMessage = function(msg) {
            postProxyMsg({
                id: this.id,
                task: 'postWorker',
                msg: msg
            });
        };

        WorkerProxy.prototype.terminate = function() {
            postProxyMsg({
                id: this.id,
                task: 'terminateWorker'
            });
            delete workerList[this.id];
        };

        /** --------------------------------------------------------------------
         * XHR proxy implementation.
         */
        var xhrList = [];
        var lastXhr = 0;
        var XhrProxy = function(method, url, async, beforeSendCallback, pr) {
            postProxyMsg({
                id: lastXhr,
                task: 'xhr',
                method: method,
                url: url
            });

            xhrList[lastXhr] = pr;
            lastXhr ++;
        };

        /** --------------------------------------------------------------------
         * Handler for messages from the proxy.
         */
        var messageHandler = function(e){
            var obj = JSON.parse(e.data);

            switch (obj.type) {
                case 'xhr':
                    var pr = xhrList[obj.id];
                    if (obj.success) {
                        pr.resolve(obj.data);
                    } else {
                        pr.reject(new Error(obj.data));
                    }

                    delete xhrList[obj.id];

                    break;

                case 'worker':
                    var worker = workerList[obj.id];
                    if (obj.success) {
                        worker.onmessage.call(worker, {
                            data: obj.msg
                        });
                    } else {
                        worker.onerror.call(worker, JSON.parse(obj.msg));
                    }

                    break;
            }

        };
        window.addEventListener('message', messageHandler, false);

        /** --------------------------------------------------------------------
         * Put the xhr and worker proxy on the Bespin object.
         */
        bespin = {
            proxy: {
                xhr: XhrProxy,
                worker: WorkerProxy
            }
        };

        /** --------------------------------------------------------------------
         * Create an iFrame that has the proxy file as source. After the proxy
         * file is loaded, add a script tag with the BespinEmbedded.js file
         * as source to the current page. This will start the Bespin boot process.
         */
        iFrame = l =  document.createElement('iFrame');
        l.setAttribute('src', base + proxyFile);
        l.onload = function() {
            s = document.createElement('script');
            s.src= base + 'BespinEmbedded.js';
            head.appendChild(s);

            /** Called when Bespin has finished loading. **/
            window.onBespinLoad = function() {
                alert('Bespin is loaded! Click 4 times on an textarea to replace it with a Bespin editor.');
                /**
                 * Listen to the click event. If the user clicked four times
                 * on an textarea, then replace it with a Bespin editor.
                 */
                document.addEventListener('click', function(evt) {
                    if (evt.target.type == 'textarea' && evt.detail == 4) {
                        var supports = ['plain', 'js', 'html', 'css'];
                        var selSyntax = prompt('Choose a language (' + supports.join(', ') + '): ', 'plain');

                        if (!selSyntax || supports.indexOf(selSyntax) == -1) {
                            alert('Do not support the syntax ' + selSyntax + ' - try again!');
                            return;
                        }
                        var util = bespin.tiki.require('bespin:util/util');
                        bespin.useBespin(evt.target, util.mixin(
                            util.clone(baseConfig, true), {
                                syntax: selSyntax
                            })
                        );
                    }
                }, false);
            };
        };
        head.appendChild(l);
    }
})();
