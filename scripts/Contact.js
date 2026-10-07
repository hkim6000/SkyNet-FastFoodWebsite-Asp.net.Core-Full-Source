var ContactJs = (function () {

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
        el('co-nav').classList.add('co-open');
        el('co-scrim').classList.add('co-open');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        el('co-nav').classList.remove('co-open');
        el('co-scrim').classList.remove('co-open');
        document.body.style.overflow = '';
    }

    function toggleSub(btn) {
        var li = btn.closest('.co-mi');
        if (li) {
            li.classList.toggle('co-exp');
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
            if (q === lastQ && el('co-sugg').innerHTML !== '') {
                openSugg();
                return;
            }
            lastQ = q;
            $ApiRequest('Contact/Search', JSON.stringify([{ key: 'q', vlu: q }]));
        }, 250);
    }

    function openSugg() {
        el('co-sugg').classList.add('co-open');
    }

    function closeSugg() {
        el('co-sugg').classList.remove('co-open');
    }

    function page() {
        var s = document.querySelector('.co-site');
        return s ? s.getAttribute('data-page') : '';
    }

    function badge() {
        var n = parseInt(sget('fj-count'), 10) || 0;
        var b = el('co-badge');
        if (b) {
            b.textContent = String(n);
            b.classList.toggle('co-has', n > 0);
        }
        var bar = el('co-cartbar');
        if (bar) {
            bar.classList.toggle('co-show', n > 0 && page() !== 'Order');
            el('co-cartbar-t').textContent = 'View order (' + n + (n === 1 ? ' item)' : ' items)');
            el('co-cartbar-p').textContent = sget('fj-total');
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
        var c = el('co-code');
        if (c) {
            c.value = code;
        }
    }

    function toast() {
        var t = el('co-toast');
        t.classList.add('co-open');
        clearTimeout(ttimer);
        ttimer = setTimeout(function () {
            t.classList.remove('co-open');
        }, 3600);
    }

    function quick(id) {
        $ApiRequest('Contact/Quick', JSON.stringify([{ key: 'cart', vlu: sget('fj-cart') }, { key: 'id', vlu: id }]));
    }

    function apply(code) {
        $ApiRequest('Contact/Apply', JSON.stringify([{ key: 'code', vlu: code }]));
    }

    function values() {
        var list = [];
        var fields = document.querySelectorAll('.co-fv');
        for (var i = 0; i < fields.length; i++) {
            list.push({ key: fields[i].getAttribute('data-k'), vlu: (fields[i].value || '').trim() });
        }
        return list;
    }

    function filter() {
        $WaitOn();
        $ApiRequest('Contact/Filter', JSON.stringify(values()));
    }

    function chip(btn, value) {
        var chips = btn.parentNode.querySelectorAll('.co-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('co-act');
        }
        btn.classList.add('co-act');
        el('co-f-cat').value = value;
        filter();
    }

    function diet(btn) {
        btn.classList.toggle('co-act');
        var on = document.querySelectorAll('.co-chip-t.co-act');
        var list = [];
        for (var i = 0; i < on.length; i++) {
            list.push(on[i].getAttribute('data-d'));
        }
        el('co-f-diet').value = list.join('.');
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
        var size = document.querySelector('input[name="co-size"]:checked');
        return [
            { key: 'id', vlu: el('co-id').value },
            { key: 'size', vlu: size ? size.value : '' },
            { key: 'addons', vlu: picked('co-ad') },
            { key: 'removes', vlu: picked('co-rm') },
            { key: 'qty', vlu: el('co-qty').value }
        ];
    }

    function custom() {
        $ApiRequest('Contact/Customize', JSON.stringify(itemData()));
    }

    function qty(d) {
        var q = el('co-qty');
        var v = Math.max(1, Math.min(20, (parseInt(q.value, 10) || 1) + d));
        q.value = String(v);
        custom();
    }

    function add() {
        $ApiRequest('Contact/Add', JSON.stringify(itemData().concat([{ key: 'cart', vlu: sget('fj-cart') }])));
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
        $ApiRequest('Contact/Update', JSON.stringify(orderData(op, idx)));
    }

    function promo() {
        $ApiRequest('Contact/Promo', JSON.stringify(orderData('', 0).concat([{ key: 'code', vlu: el('co-code').value }])));
    }

    function dropPromo() {
        setPromo('');
        el('co-promo-msg').innerHTML = '';
        update('', 0);
    }

    function mode(m) {
        orderMode = m;
        var b = document.querySelectorAll('.co-seg-b');
        for (var i = 0; i < b.length; i++) {
            b[i].classList.toggle('co-act', b[i].getAttribute('data-m') === m);
        }
        el('co-addr').classList.toggle('co-show', m === 'delivery');
        update('', 0);
    }

    function cartState(n) {
        el('co-place').classList.toggle('co-off', n === 0);
    }

    function place() {
        $WaitOn();
        $ApiRequest('Contact/Place', JSON.stringify([
            { key: 'cart', vlu: sget('fj-cart') },
            { key: 'promo', vlu: sget('fj-promo') },
            { key: 'mode', vlu: orderMode },
            { key: 'store', vlu: el('co-store').value },
            { key: 'time', vlu: el('co-time').value },
            { key: 'name', vlu: el('co-name').value },
            { key: 'phone', vlu: el('co-phone').value },
            { key: 'email', vlu: el('co-email').value },
            { key: 'address', vlu: el('co-address').value }
        ]));
    }

    function placed() {
        setCart('', 0, '$0.00');
        setPromo('');
        el('co-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function pickPkg(key) {
        el('co-pkg').value = key;
        el('quote').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function quote() {
        $ApiRequest('Contact/Quote', JSON.stringify([
            { key: 'pkg', vlu: el('co-pkg').value },
            { key: 'guests', vlu: el('co-guests').value },
            { key: 'addons', vlu: picked('co-cad') }
        ]));
    }

    function quoted(key, guests) {
        el('co-rpkg').value = key;
        el('co-rguests').value = String(guests);
    }

    function request() {
        $WaitOn();
        $ApiRequest('Contact/Send', JSON.stringify([
            { key: 'name', vlu: el('co-name').value },
            { key: 'email', vlu: el('co-email').value },
            { key: 'phone', vlu: el('co-phone').value },
            { key: 'date', vlu: el('co-date').value },
            { key: 'guests', vlu: el('co-rguests').value },
            { key: 'pkg', vlu: el('co-rpkg').value },
            { key: 'notes', vlu: el('co-notes').value }
        ]));
    }

    function points() {
        $ApiRequest('Contact/Points', JSON.stringify([
            { key: 'spend', vlu: el('co-spend').value },
            { key: 'visits', vlu: el('co-visits').value }
        ]));
    }

    function join() {
        $WaitOn();
        $ApiRequest('Contact/Join', JSON.stringify([
            { key: 'name', vlu: el('co-name').value },
            { key: 'email', vlu: el('co-email').value },
            { key: 'month', vlu: el('co-month').value },
            { key: 'agree', vlu: el('co-agree').checked ? '1' : '' }
        ]));
    }

    function feature(btn, key) {
        var chips = btn.parentNode.querySelectorAll('.co-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('co-act');
        }
        btn.classList.add('co-act');
        $ApiRequest('Contact/Filter', JSON.stringify([{ key: 'feat', vlu: key }]));
    }

    function store(key) {
        $ApiRequest('Contact/View', JSON.stringify([{ key: 'key', vlu: key }]));
    }

    function pick(key) {
        var n = document.querySelectorAll('.co-st, .co-pin');
        for (var i = 0; i < n.length; i++) {
            n[i].classList.toggle('co-act', n[i].getAttribute('data-k') === key);
        }
    }

    function send() {
        $WaitOn();
        $ApiRequest('Contact/Send', JSON.stringify([
            { key: 'name', vlu: el('co-name').value },
            { key: 'email', vlu: el('co-email').value },
            { key: 'topic', vlu: el('co-topic').value },
            { key: 'store', vlu: el('co-store').value },
            { key: 'message', vlu: el('co-msg').value }
        ]));
    }

    function sent() {
        var f = el('co-form');
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
        $ApiRequest('Contact/Subscribe', JSON.stringify([{ key: 'email', vlu: el('co-nl-email').value }]));
    }

    function subscribed() {
        el('co-nl-email').value = '';
    }

    function reveal() {
        badge();
        document.addEventListener('click', function (e) {
            var box = el('co-search');
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
            var h = el('co-head');
            if (h) {
                h.classList.toggle('co-scrolled', window.pageYOffset > 8);
            }
        }, { passive: true });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 767) {
                closeNav();
            }
        });
        if (page() === 'Order') {
            el('co-code').value = sget('fj-promo');
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

ContactJs.reveal();
