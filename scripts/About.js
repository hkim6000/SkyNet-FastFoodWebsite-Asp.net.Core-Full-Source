var AboutJs = (function () {

    var timer = null;
    var ttimer = null;
    var lastQ = '';
    var orderMode = 'pickup';

    function el(id) {
        return document.getElementById(id);
    }

    function sget(k) {
        try {
            return window.sessionStorage.getItem(k) || '';
        } catch (e) {
            return '';
        }
    }

    function sset(k, v) {
        try {
            window.sessionStorage.setItem(k, v);
        } catch (e) {
        }
    }

    function openNav() {
        el('ab-nav').classList.add('ab-open');
        el('ab-scrim').classList.add('ab-open');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        el('ab-nav').classList.remove('ab-open');
        el('ab-scrim').classList.remove('ab-open');
        document.body.style.overflow = '';
    }

    function toggleSub(btn) {
        var li = btn.closest('.ab-mi');
        if (li) {
            li.classList.toggle('ab-exp');
        }
    }

    function search(value) {
        var q = (value || '').trim();
        clearTimeout(timer);
        if (q.length < 2) {
            closeSugg();
            lastQ = '';
            return;
        }
        timer = setTimeout(function () {
            if (q === lastQ && el('ab-sugg').innerHTML !== '') {
                openSugg();
                return;
            }
            lastQ = q;
            $ApiRequest('About/Search', JSON.stringify([{ key: 'q', vlu: q }]));
        }, 250);
    }

    function openSugg() {
        el('ab-sugg').classList.add('ab-open');
    }

    function closeSugg() {
        el('ab-sugg').classList.remove('ab-open');
    }

    function page() {
        var s = document.querySelector('.ab-site');
        return s ? s.getAttribute('data-page') : '';
    }

    function badge() {
        var n = parseInt(sget('fj-count'), 10) || 0;
        var b = el('ab-badge');
        if (b) {
            b.textContent = String(n);
            b.classList.toggle('ab-has', n > 0);
        }
        var bar = el('ab-cartbar');
        if (bar) {
            bar.classList.toggle('ab-show', n > 0 && page() !== 'Order');
            el('ab-cartbar-t').textContent = 'View order (' + n + (n === 1 ? ' item)' : ' items)');
            el('ab-cartbar-p').textContent = sget('fj-total');
        }
    }

    function setCart(cart, count, total) {
        sset('fj-cart', cart);
        sset('fj-count', String(count));
        sset('fj-total', total);
        badge();
    }

    function setPromo(code) {
        sset('fj-promo', code);
        var c = el('ab-code');
        if (c) {
            c.value = code;
        }
    }

    function toast() {
        var t = el('ab-toast');
        t.classList.add('ab-open');
        clearTimeout(ttimer);
        ttimer = setTimeout(function () {
            t.classList.remove('ab-open');
        }, 3600);
    }

    function quick(id) {
        $ApiRequest('About/Quick', JSON.stringify([{ key: 'cart', vlu: sget('fj-cart') }, { key: 'id', vlu: id }]));
    }

    function apply(code) {
        $ApiRequest('About/Apply', JSON.stringify([{ key: 'code', vlu: code }]));
    }

    function values() {
        var list = [];
        var fields = document.querySelectorAll('.ab-fv');
        for (var i = 0; i < fields.length; i++) {
            list.push({ key: fields[i].getAttribute('data-k'), vlu: (fields[i].value || '').trim() });
        }
        return list;
    }

    function filter() {
        $WaitOn();
        $ApiRequest('About/Filter', JSON.stringify(values()));
    }

    function chip(btn, value) {
        var chips = btn.parentNode.querySelectorAll('.ab-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('ab-act');
        }
        btn.classList.add('ab-act');
        el('ab-f-cat').value = value;
        filter();
    }

    function diet(btn) {
        btn.classList.toggle('ab-act');
        var on = document.querySelectorAll('.ab-chip-t.ab-act');
        var list = [];
        for (var i = 0; i < on.length; i++) {
            list.push(on[i].getAttribute('data-d'));
        }
        el('ab-f-diet').value = list.join('.');
        filter();
    }

    function picked(cls) {
        var list = [];
        var boxes = document.querySelectorAll('.' + cls + ':checked');
        for (var i = 0; i < boxes.length; i++) {
            list.push(boxes[i].value);
        }
        return list.join('.');
    }

    function itemData() {
        var size = document.querySelector('input[name="ab-size"]:checked');
        return [
            { key: 'id', vlu: el('ab-id').value },
            { key: 'size', vlu: size ? size.value : '' },
            { key: 'addons', vlu: picked('ab-ad') },
            { key: 'removes', vlu: picked('ab-rm') },
            { key: 'qty', vlu: el('ab-qty').value }
        ];
    }

    function custom() {
        $ApiRequest('About/Customize', JSON.stringify(itemData()));
    }

    function qty(d) {
        var q = el('ab-qty');
        var v = Math.max(1, Math.min(20, (parseInt(q.value, 10) || 1) + d));
        q.value = String(v);
        custom();
    }

    function add() {
        $ApiRequest('About/Add', JSON.stringify(itemData().concat([{ key: 'cart', vlu: sget('fj-cart') }])));
    }

    function orderData(op, idx) {
        return [
            { key: 'cart', vlu: sget('fj-cart') },
            { key: 'promo', vlu: sget('fj-promo') },
            { key: 'mode', vlu: orderMode },
            { key: 'op', vlu: op || '' },
            { key: 'idx', vlu: String(idx || 0) }
        ];
    }

    function update(op, idx) {
        $ApiRequest('About/Update', JSON.stringify(orderData(op, idx)));
    }

    function promo() {
        $ApiRequest('About/Promo', JSON.stringify(orderData('', 0).concat([{ key: 'code', vlu: el('ab-code').value }])));
    }

    function dropPromo() {
        setPromo('');
        el('ab-promo-msg').innerHTML = '';
        update('', 0);
    }

    function mode(m) {
        orderMode = m;
        var b = document.querySelectorAll('.ab-seg-b');
        for (var i = 0; i < b.length; i++) {
            b[i].classList.toggle('ab-act', b[i].getAttribute('data-m') === m);
        }
        el('ab-addr').classList.toggle('ab-show', m === 'delivery');
        update('', 0);
    }

    function cartState(n) {
        el('ab-place').classList.toggle('ab-off', n === 0);
    }

    function place() {
        $WaitOn();
        $ApiRequest('About/Place', JSON.stringify([
            { key: 'cart', vlu: sget('fj-cart') },
            { key: 'promo', vlu: sget('fj-promo') },
            { key: 'mode', vlu: orderMode },
            { key: 'store', vlu: el('ab-store').value },
            { key: 'time', vlu: el('ab-time').value },
            { key: 'name', vlu: el('ab-name').value },
            { key: 'phone', vlu: el('ab-phone').value },
            { key: 'email', vlu: el('ab-email').value },
            { key: 'address', vlu: el('ab-address').value }
        ]));
    }

    function placed() {
        setCart('', 0, '$0.00');
        setPromo('');
        el('ab-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function pickPkg(key) {
        el('ab-pkg').value = key;
        el('quote').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function quote() {
        $ApiRequest('About/Quote', JSON.stringify([
            { key: 'pkg', vlu: el('ab-pkg').value },
            { key: 'guests', vlu: el('ab-guests').value },
            { key: 'addons', vlu: picked('ab-cad') }
        ]));
    }

    function quoted(key, guests) {
        el('ab-rpkg').value = key;
        el('ab-rguests').value = String(guests);
    }

    function request() {
        $WaitOn();
        $ApiRequest('About/Send', JSON.stringify([
            { key: 'name', vlu: el('ab-name').value },
            { key: 'email', vlu: el('ab-email').value },
            { key: 'phone', vlu: el('ab-phone').value },
            { key: 'date', vlu: el('ab-date').value },
            { key: 'guests', vlu: el('ab-rguests').value },
            { key: 'pkg', vlu: el('ab-rpkg').value },
            { key: 'notes', vlu: el('ab-notes').value }
        ]));
    }

    function points() {
        $ApiRequest('About/Points', JSON.stringify([
            { key: 'spend', vlu: el('ab-spend').value },
            { key: 'visits', vlu: el('ab-visits').value }
        ]));
    }

    function join() {
        $WaitOn();
        $ApiRequest('About/Join', JSON.stringify([
            { key: 'name', vlu: el('ab-name').value },
            { key: 'email', vlu: el('ab-email').value },
            { key: 'month', vlu: el('ab-month').value },
            { key: 'agree', vlu: el('ab-agree').checked ? '1' : '' }
        ]));
    }

    function feature(btn, key) {
        var chips = btn.parentNode.querySelectorAll('.ab-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('ab-act');
        }
        btn.classList.add('ab-act');
        $ApiRequest('About/Filter', JSON.stringify([{ key: 'feat', vlu: key }]));
    }

    function store(key) {
        $ApiRequest('About/View', JSON.stringify([{ key: 'key', vlu: key }]));
    }

    function pick(key) {
        var n = document.querySelectorAll('.ab-st, .ab-pin');
        for (var i = 0; i < n.length; i++) {
            n[i].classList.toggle('ab-act', n[i].getAttribute('data-k') === key);
        }
    }

    function send() {
        $WaitOn();
        $ApiRequest('About/Send', JSON.stringify([
            { key: 'name', vlu: el('ab-name').value },
            { key: 'email', vlu: el('ab-email').value },
            { key: 'topic', vlu: el('ab-topic').value },
            { key: 'store', vlu: el('ab-store').value },
            { key: 'message', vlu: el('ab-msg').value }
        ]));
    }

    function sent() {
        var f = el('ab-form');
        if (!f) {
            return;
        }
        var fields = f.querySelectorAll('input, textarea, select');
        for (var i = 0; i < fields.length; i++) {
            if (fields[i].type === 'checkbox') {
                fields[i].checked = false;
            } else {
                fields[i].value = '';
            }
        }
    }

    function subscribe() {
        $ApiRequest('About/Subscribe', JSON.stringify([{ key: 'email', vlu: el('ab-nl-email').value }]));
    }

    function subscribed() {
        el('ab-nl-email').value = '';
    }

    function reveal() {
        badge();
        document.addEventListener('click', function (e) {
            var box = el('ab-search');
            if (box && !box.contains(e.target)) {
                closeSugg();
            }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeSugg();
                closeNav();
            }
        });
        window.addEventListener('scroll', function () {
            var h = el('ab-head');
            if (h) {
                h.classList.toggle('ab-scrolled', window.pageYOffset > 8);
            }
        }, { passive: true });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 767) {
                closeNav();
            }
        });
        if (page() === 'Order') {
            el('ab-code').value = sget('fj-promo');
            update('', 0);
        }
    }

    return {
        reveal: function () { reveal(); },
        openNav: function () { openNav(); },
        closeNav: function () { closeNav(); },
        toggleSub: function (btn) { toggleSub(btn); },
        search: function (v) { search(v); },
        openSugg: function () { openSugg(); },
        closeSugg: function () { closeSugg(); },
        setCart: function (c, n, t) { setCart(c, n, t); },
        setPromo: function (c) { setPromo(c); },
        toast: function () { toast(); },
        quick: function (id) { quick(id); },
        apply: function (c) { apply(c); },
        filter: function () { filter(); },
        chip: function (btn, v) { chip(btn, v); },
        diet: function (btn) { diet(btn); },
        custom: function () { custom(); },
        qty: function (d) { qty(d); },
        add: function () { add(); },
        update: function (op, idx) { update(op, idx); },
        promo: function () { promo(); },
        dropPromo: function () { dropPromo(); },
        mode: function (m) { mode(m); },
        cartState: function (n) { cartState(n); },
        place: function () { place(); },
        placed: function () { placed(); },
        pickPkg: function (k) { pickPkg(k); },
        quote: function () { quote(); },
        quoted: function (k, g) { quoted(k, g); },
        request: function () { request(); },
        points: function () { points(); },
        join: function () { join(); },
        feature: function (btn, k) { feature(btn, k); },
        store: function (k) { store(k); },
        pick: function (k) { pick(k); },
        send: function () { send(); },
        sent: function () { sent(); },
        subscribe: function () { subscribe(); },
        subscribed: function () { subscribed(); }
    };

})();

AboutJs.reveal();
