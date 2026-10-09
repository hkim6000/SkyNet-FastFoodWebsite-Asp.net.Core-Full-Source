var LocationsJs = (function () {

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
        el('lc-nav').classList.add('lc-open');
        el('lc-scrim').classList.add('lc-open');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        el('lc-nav').classList.remove('lc-open');
        el('lc-scrim').classList.remove('lc-open');
        document.body.style.overflow = '';
    }

    function toggleSub(btn) {
        var li = btn.closest('.lc-mi');
        if (li) {
            li.classList.toggle('lc-exp');
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
            if (q === lastQ && el('lc-sugg').innerHTML !== '') {
                openSugg();
                return;
            }
            lastQ = q;
            $ApiRequest('Locations/Search', JSON.stringify([{ key: 'q', vlu: q }]));
        }, 250);
    }

    function openSugg() {
        el('lc-sugg').classList.add('lc-open');
    }

    function closeSugg() {
        el('lc-sugg').classList.remove('lc-open');
    }

    function page() {
        var s = document.querySelector('.lc-site');
        return s ? s.getAttribute('data-page') : '';
    }

    function badge() {
        var n = parseInt(sget('fj-count'), 10) || 0;
        var b = el('lc-badge');
        if (b) {
            b.textContent = String(n);
            b.classList.toggle('lc-has', n > 0);
        }
        var bar = el('lc-cartbar');
        if (bar) {
            bar.classList.toggle('lc-show', n > 0 && page() !== 'Order');
            el('lc-cartbar-t').textContent = 'View order (' + n + (n === 1 ? ' item)' : ' items)');
            el('lc-cartbar-p').textContent = sget('fj-total');
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
        var c = el('lc-code');
        if (c) {
            c.value = code;
        }
    }

    function toast() {
        var t = el('lc-toast');
        t.classList.add('lc-open');
        clearTimeout(ttimer);
        ttimer = setTimeout(function () {
            t.classList.remove('lc-open');
        }, 3600);
    }

    function quick(id) {
        $ApiRequest('Locations/Quick', JSON.stringify([{ key: 'cart', vlu: sget('fj-cart') }, { key: 'id', vlu: id }]));
    }

    function apply(code) {
        $ApiRequest('Locations/Apply', JSON.stringify([{ key: 'code', vlu: code }]));
    }

    function values() {
        var list = [];
        var fields = document.querySelectorAll('.lc-fv');
        for (var i = 0; i < fields.length; i++) {
            list.push({ key: fields[i].getAttribute('data-k'), vlu: (fields[i].value || '').trim() });
        }
        return list;
    }

    function filter() {
        $WaitOn();
        $ApiRequest('Locations/Filter', JSON.stringify(values()));
    }

    function chip(btn, value) {
        var chips = btn.parentNode.querySelectorAll('.lc-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('lc-act');
        }
        btn.classList.add('lc-act');
        el('lc-f-cat').value = value;
        filter();
    }

    function diet(btn) {
        btn.classList.toggle('lc-act');
        var on = document.querySelectorAll('.lc-chip-t.lc-act');
        var list = [];
        for (var i = 0; i < on.length; i++) {
            list.push(on[i].getAttribute('data-d'));
        }
        el('lc-f-diet').value = list.join('.');
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
        var size = document.querySelector('input[name="lc-size"]:checked');
        return [
            { key: 'id', vlu: el('lc-id').value },
            { key: 'size', vlu: size ? size.value : '' },
            { key: 'addons', vlu: picked('lc-ad') },
            { key: 'removes', vlu: picked('lc-rm') },
            { key: 'qty', vlu: el('lc-qty').value }
        ];
    }

    function custom() {
        $ApiRequest('Locations/Customize', JSON.stringify(itemData()));
    }

    function qty(d) {
        var q = el('lc-qty');
        var v = Math.max(1, Math.min(20, (parseInt(q.value, 10) || 1) + d));
        q.value = String(v);
        custom();
    }

    function add() {
        $ApiRequest('Locations/Add', JSON.stringify(itemData().concat([{ key: 'cart', vlu: sget('fj-cart') }])));
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
        $ApiRequest('Locations/Update', JSON.stringify(orderData(op, idx)));
    }

    function promo() {
        $ApiRequest('Locations/Promo', JSON.stringify(orderData('', 0).concat([{ key: 'code', vlu: el('lc-code').value }])));
    }

    function dropPromo() {
        setPromo('');
        el('lc-promo-msg').innerHTML = '';
        update('', 0);
    }

    function mode(m) {
        orderMode = m;
        var b = document.querySelectorAll('.lc-seg-b');
        for (var i = 0; i < b.length; i++) {
            b[i].classList.toggle('lc-act', b[i].getAttribute('data-m') === m);
        }
        el('lc-addr').classList.toggle('lc-show', m === 'delivery');
        update('', 0);
    }

    function cartState(n) {
        el('lc-place').classList.toggle('lc-off', n === 0);
    }

    function place() {
        $WaitOn();
        $ApiRequest('Locations/Place', JSON.stringify([
            { key: 'cart', vlu: sget('fj-cart') },
            { key: 'promo', vlu: sget('fj-promo') },
            { key: 'mode', vlu: orderMode },
            { key: 'store', vlu: el('lc-store').value },
            { key: 'time', vlu: el('lc-time').value },
            { key: 'name', vlu: el('lc-name').value },
            { key: 'phone', vlu: el('lc-phone').value },
            { key: 'email', vlu: el('lc-email').value },
            { key: 'address', vlu: el('lc-address').value }
        ]));
    }

    function placed() {
        setCart('', 0, '$0.00');
        setPromo('');
        el('lc-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function pickPkg(key) {
        el('lc-pkg').value = key;
        el('quote').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function quote() {
        $ApiRequest('Locations/Quote', JSON.stringify([
            { key: 'pkg', vlu: el('lc-pkg').value },
            { key: 'guests', vlu: el('lc-guests').value },
            { key: 'addons', vlu: picked('lc-cad') }
        ]));
    }

    function quoted(key, guests) {
        el('lc-rpkg').value = key;
        el('lc-rguests').value = String(guests);
    }

    function request() {
        $WaitOn();
        $ApiRequest('Locations/Send', JSON.stringify([
            { key: 'name', vlu: el('lc-name').value },
            { key: 'email', vlu: el('lc-email').value },
            { key: 'phone', vlu: el('lc-phone').value },
            { key: 'date', vlu: el('lc-date').value },
            { key: 'guests', vlu: el('lc-rguests').value },
            { key: 'pkg', vlu: el('lc-rpkg').value },
            { key: 'notes', vlu: el('lc-notes').value }
        ]));
    }

    function points() {
        $ApiRequest('Locations/Points', JSON.stringify([
            { key: 'spend', vlu: el('lc-spend').value },
            { key: 'visits', vlu: el('lc-visits').value }
        ]));
    }

    function join() {
        $WaitOn();
        $ApiRequest('Locations/Join', JSON.stringify([
            { key: 'name', vlu: el('lc-name').value },
            { key: 'email', vlu: el('lc-email').value },
            { key: 'month', vlu: el('lc-month').value },
            { key: 'agree', vlu: el('lc-agree').checked ? '1' : '' }
        ]));
    }

    function feature(btn, key) {
        var chips = btn.parentNode.querySelectorAll('.lc-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('lc-act');
        }
        btn.classList.add('lc-act');
        $ApiRequest('Locations/Filter', JSON.stringify([{ key: 'feat', vlu: key }]));
    }

    function store(key) {
        $ApiRequest('Locations/View', JSON.stringify([{ key: 'key', vlu: key }]));
    }

    function pick(key) {
        var n = document.querySelectorAll('.lc-st, .lc-pin');
        for (var i = 0; i < n.length; i++) {
            n[i].classList.toggle('lc-act', n[i].getAttribute('data-k') === key);
        }
    }

    function send() {
        $WaitOn();
        $ApiRequest('Locations/Send', JSON.stringify([
            { key: 'name', vlu: el('lc-name').value },
            { key: 'email', vlu: el('lc-email').value },
            { key: 'topic', vlu: el('lc-topic').value },
            { key: 'store', vlu: el('lc-store').value },
            { key: 'message', vlu: el('lc-msg').value }
        ]));
    }

    function sent() {
        var f = el('lc-form');
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
        $ApiRequest('Locations/Subscribe', JSON.stringify([{ key: 'email', vlu: el('lc-nl-email').value }]));
    }

    function subscribed() {
        el('lc-nl-email').value = '';
    }

    function reveal() {
        badge();
        document.addEventListener('click', function (e) {
            var box = el('lc-search');
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
            var h = el('lc-head');
            if (h) {
                h.classList.toggle('lc-scrolled', window.pageYOffset > 8);
            }
        }, { passive: true });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 767) {
                closeNav();
            }
        });
        if (page() === 'Order') {
            el('lc-code').value = sget('fj-promo');
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', LocationsJs.reveal);
} else {
    LocationsJs.reveal();
}
