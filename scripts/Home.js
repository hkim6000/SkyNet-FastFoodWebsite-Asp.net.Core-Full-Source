var HomeJs = (function () {

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
        el('hm-nav').classList.add('hm-open');
        el('hm-scrim').classList.add('hm-open');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        el('hm-nav').classList.remove('hm-open');
        el('hm-scrim').classList.remove('hm-open');
        document.body.style.overflow = '';
    }

    function toggleSub(btn) {
        var li = btn.closest('.hm-mi');
        if (li) {
            li.classList.toggle('hm-exp');
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
            if (q === lastQ && el('hm-sugg').innerHTML !== '') {
                openSugg();
                return;
            }
            lastQ = q;
            $ApiRequest('Home/Search', JSON.stringify([{ key: 'q', vlu: q }]));
        }, 250);
    }

    function openSugg() {
        el('hm-sugg').classList.add('hm-open');
    }

    function closeSugg() {
        el('hm-sugg').classList.remove('hm-open');
    }

    function page() {
        var s = document.querySelector('.hm-site');
        return s ? s.getAttribute('data-page') : '';
    }

    function badge() {
        var n = parseInt(sget('fj-count'), 10) || 0;
        var b = el('hm-badge');
        if (b) {
            b.textContent = String(n);
            b.classList.toggle('hm-has', n > 0);
        }
        var bar = el('hm-cartbar');
        if (bar) {
            bar.classList.toggle('hm-show', n > 0 && page() !== 'Order');
            el('hm-cartbar-t').textContent = 'View order (' + n + (n === 1 ? ' item)' : ' items)');
            el('hm-cartbar-p').textContent = sget('fj-total');
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
        var c = el('hm-code');
        if (c) {
            c.value = code;
        }
    }

    function toast() {
        var t = el('hm-toast');
        t.classList.add('hm-open');
        clearTimeout(ttimer);
        ttimer = setTimeout(function () {
            t.classList.remove('hm-open');
        }, 3600);
    }

    function quick(id) {
        $ApiRequest('Home/Quick', JSON.stringify([{ key: 'cart', vlu: sget('fj-cart') }, { key: 'id', vlu: id }]));
    }

    function apply(code) {
        $ApiRequest('Home/Apply', JSON.stringify([{ key: 'code', vlu: code }]));
    }

    function values() {
        var list = [];
        var fields = document.querySelectorAll('.hm-fv');
        for (var i = 0; i < fields.length; i++) {
            list.push({ key: fields[i].getAttribute('data-k'), vlu: (fields[i].value || '').trim() });
        }
        return list;
    }

    function filter() {
        $WaitOn();
        $ApiRequest('Home/Filter', JSON.stringify(values()));
    }

    function chip(btn, value) {
        var chips = btn.parentNode.querySelectorAll('.hm-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('hm-act');
        }
        btn.classList.add('hm-act');
        el('hm-f-cat').value = value;
        filter();
    }

    function diet(btn) {
        btn.classList.toggle('hm-act');
        var on = document.querySelectorAll('.hm-chip-t.hm-act');
        var list = [];
        for (var i = 0; i < on.length; i++) {
            list.push(on[i].getAttribute('data-d'));
        }
        el('hm-f-diet').value = list.join('.');
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
        var size = document.querySelector('input[name="hm-size"]:checked');
        return [
            { key: 'id', vlu: el('hm-id').value },
            { key: 'size', vlu: size ? size.value : '' },
            { key: 'addons', vlu: picked('hm-ad') },
            { key: 'removes', vlu: picked('hm-rm') },
            { key: 'qty', vlu: el('hm-qty').value }
        ];
    }

    function custom() {
        $ApiRequest('Home/Customize', JSON.stringify(itemData()));
    }

    function qty(d) {
        var q = el('hm-qty');
        var v = Math.max(1, Math.min(20, (parseInt(q.value, 10) || 1) + d));
        q.value = String(v);
        custom();
    }

    function add() {
        $ApiRequest('Home/Add', JSON.stringify(itemData().concat([{ key: 'cart', vlu: sget('fj-cart') }])));
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
        $ApiRequest('Home/Update', JSON.stringify(orderData(op, idx)));
    }

    function promo() {
        $ApiRequest('Home/Promo', JSON.stringify(orderData('', 0).concat([{ key: 'code', vlu: el('hm-code').value }])));
    }

    function dropPromo() {
        setPromo('');
        el('hm-promo-msg').innerHTML = '';
        update('', 0);
    }

    function mode(m) {
        orderMode = m;
        var b = document.querySelectorAll('.hm-seg-b');
        for (var i = 0; i < b.length; i++) {
            b[i].classList.toggle('hm-act', b[i].getAttribute('data-m') === m);
        }
        el('hm-addr').classList.toggle('hm-show', m === 'delivery');
        update('', 0);
    }

    function cartState(n) {
        el('hm-place').classList.toggle('hm-off', n === 0);
    }

    function place() {
        $WaitOn();
        $ApiRequest('Home/Place', JSON.stringify([
            { key: 'cart', vlu: sget('fj-cart') },
            { key: 'promo', vlu: sget('fj-promo') },
            { key: 'mode', vlu: orderMode },
            { key: 'store', vlu: el('hm-store').value },
            { key: 'time', vlu: el('hm-time').value },
            { key: 'name', vlu: el('hm-name').value },
            { key: 'phone', vlu: el('hm-phone').value },
            { key: 'email', vlu: el('hm-email').value },
            { key: 'address', vlu: el('hm-address').value }
        ]));
    }

    function placed() {
        setCart('', 0, '$0.00');
        setPromo('');
        el('hm-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function pickPkg(key) {
        el('hm-pkg').value = key;
        el('quote').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function quote() {
        $ApiRequest('Home/Quote', JSON.stringify([
            { key: 'pkg', vlu: el('hm-pkg').value },
            { key: 'guests', vlu: el('hm-guests').value },
            { key: 'addons', vlu: picked('hm-cad') }
        ]));
    }

    function quoted(key, guests) {
        el('hm-rpkg').value = key;
        el('hm-rguests').value = String(guests);
    }

    function request() {
        $WaitOn();
        $ApiRequest('Home/Send', JSON.stringify([
            { key: 'name', vlu: el('hm-name').value },
            { key: 'email', vlu: el('hm-email').value },
            { key: 'phone', vlu: el('hm-phone').value },
            { key: 'date', vlu: el('hm-date').value },
            { key: 'guests', vlu: el('hm-rguests').value },
            { key: 'pkg', vlu: el('hm-rpkg').value },
            { key: 'notes', vlu: el('hm-notes').value }
        ]));
    }

    function points() {
        $ApiRequest('Home/Points', JSON.stringify([
            { key: 'spend', vlu: el('hm-spend').value },
            { key: 'visits', vlu: el('hm-visits').value }
        ]));
    }

    function join() {
        $WaitOn();
        $ApiRequest('Home/Join', JSON.stringify([
            { key: 'name', vlu: el('hm-name').value },
            { key: 'email', vlu: el('hm-email').value },
            { key: 'month', vlu: el('hm-month').value },
            { key: 'agree', vlu: el('hm-agree').checked ? '1' : '' }
        ]));
    }

    function feature(btn, key) {
        var chips = btn.parentNode.querySelectorAll('.hm-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('hm-act');
        }
        btn.classList.add('hm-act');
        $ApiRequest('Home/Filter', JSON.stringify([{ key: 'feat', vlu: key }]));
    }

    function store(key) {
        $ApiRequest('Home/View', JSON.stringify([{ key: 'key', vlu: key }]));
    }

    function pick(key) {
        var n = document.querySelectorAll('.hm-st, .hm-pin');
        for (var i = 0; i < n.length; i++) {
            n[i].classList.toggle('hm-act', n[i].getAttribute('data-k') === key);
        }
    }

    function send() {
        $WaitOn();
        $ApiRequest('Home/Send', JSON.stringify([
            { key: 'name', vlu: el('hm-name').value },
            { key: 'email', vlu: el('hm-email').value },
            { key: 'topic', vlu: el('hm-topic').value },
            { key: 'store', vlu: el('hm-store').value },
            { key: 'message', vlu: el('hm-msg').value }
        ]));
    }

    function sent() {
        var f = el('hm-form');
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
        $ApiRequest('Home/Subscribe', JSON.stringify([{ key: 'email', vlu: el('hm-nl-email').value }]));
    }

    function subscribed() {
        el('hm-nl-email').value = '';
    }

    function reveal() {
        badge();
        document.addEventListener('click', function (e) {
            var box = el('hm-search');
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
            var h = el('hm-head');
            if (h) {
                h.classList.toggle('hm-scrolled', window.pageYOffset > 8);
            }
        }, { passive: true });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 767) {
                closeNav();
            }
        });
        if (page() === 'Order') {
            el('hm-code').value = sget('fj-promo');
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

HomeJs.reveal();
