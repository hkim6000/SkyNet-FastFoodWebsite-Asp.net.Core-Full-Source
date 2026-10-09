var CateringJs = (function () {

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
        el('ct-nav').classList.add('ct-open');
        el('ct-scrim').classList.add('ct-open');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        el('ct-nav').classList.remove('ct-open');
        el('ct-scrim').classList.remove('ct-open');
        document.body.style.overflow = '';
    }

    function toggleSub(btn) {
        var li = btn.closest('.ct-mi');
        if (li) {
            li.classList.toggle('ct-exp');
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
            if (q === lastQ && el('ct-sugg').innerHTML !== '') {
                openSugg();
                return;
            }
            lastQ = q;
            $ApiRequest('Catering/Search', JSON.stringify([{ key: 'q', vlu: q }]));
        }, 250);
    }

    function openSugg() {
        el('ct-sugg').classList.add('ct-open');
    }

    function closeSugg() {
        el('ct-sugg').classList.remove('ct-open');
    }

    function page() {
        var s = document.querySelector('.ct-site');
        return s ? s.getAttribute('data-page') : '';
    }

    function badge() {
        var n = parseInt(sget('fj-count'), 10) || 0;
        var b = el('ct-badge');
        if (b) {
            b.textContent = String(n);
            b.classList.toggle('ct-has', n > 0);
        }
        var bar = el('ct-cartbar');
        if (bar) {
            bar.classList.toggle('ct-show', n > 0 && page() !== 'Order');
            el('ct-cartbar-t').textContent = 'View order (' + n + (n === 1 ? ' item)' : ' items)');
            el('ct-cartbar-p').textContent = sget('fj-total');
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
        var c = el('ct-code');
        if (c) {
            c.value = code;
        }
    }

    function toast() {
        var t = el('ct-toast');
        t.classList.add('ct-open');
        clearTimeout(ttimer);
        ttimer = setTimeout(function () {
            t.classList.remove('ct-open');
        }, 3600);
    }

    function quick(id) {
        $ApiRequest('Catering/Quick', JSON.stringify([{ key: 'cart', vlu: sget('fj-cart') }, { key: 'id', vlu: id }]));
    }

    function apply(code) {
        $ApiRequest('Catering/Apply', JSON.stringify([{ key: 'code', vlu: code }]));
    }

    function values() {
        var list = [];
        var fields = document.querySelectorAll('.ct-fv');
        for (var i = 0; i < fields.length; i++) {
            list.push({ key: fields[i].getAttribute('data-k'), vlu: (fields[i].value || '').trim() });
        }
        return list;
    }

    function filter() {
        $WaitOn();
        $ApiRequest('Catering/Filter', JSON.stringify(values()));
    }

    function chip(btn, value) {
        var chips = btn.parentNode.querySelectorAll('.ct-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('ct-act');
        }
        btn.classList.add('ct-act');
        el('ct-f-cat').value = value;
        filter();
    }

    function diet(btn) {
        btn.classList.toggle('ct-act');
        var on = document.querySelectorAll('.ct-chip-t.ct-act');
        var list = [];
        for (var i = 0; i < on.length; i++) {
            list.push(on[i].getAttribute('data-d'));
        }
        el('ct-f-diet').value = list.join('.');
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
        var size = document.querySelector('input[name="ct-size"]:checked');
        return [
            { key: 'id', vlu: el('ct-id').value },
            { key: 'size', vlu: size ? size.value : '' },
            { key: 'addons', vlu: picked('ct-ad') },
            { key: 'removes', vlu: picked('ct-rm') },
            { key: 'qty', vlu: el('ct-qty').value }
        ];
    }

    function custom() {
        $ApiRequest('Catering/Customize', JSON.stringify(itemData()));
    }

    function qty(d) {
        var q = el('ct-qty');
        var v = Math.max(1, Math.min(20, (parseInt(q.value, 10) || 1) + d));
        q.value = String(v);
        custom();
    }

    function add() {
        $ApiRequest('Catering/Add', JSON.stringify(itemData().concat([{ key: 'cart', vlu: sget('fj-cart') }])));
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
        $ApiRequest('Catering/Update', JSON.stringify(orderData(op, idx)));
    }

    function promo() {
        $ApiRequest('Catering/Promo', JSON.stringify(orderData('', 0).concat([{ key: 'code', vlu: el('ct-code').value }])));
    }

    function dropPromo() {
        setPromo('');
        el('ct-promo-msg').innerHTML = '';
        update('', 0);
    }

    function mode(m) {
        orderMode = m;
        var b = document.querySelectorAll('.ct-seg-b');
        for (var i = 0; i < b.length; i++) {
            b[i].classList.toggle('ct-act', b[i].getAttribute('data-m') === m);
        }
        el('ct-addr').classList.toggle('ct-show', m === 'delivery');
        update('', 0);
    }

    function cartState(n) {
        el('ct-place').classList.toggle('ct-off', n === 0);
    }

    function place() {
        $WaitOn();
        $ApiRequest('Catering/Place', JSON.stringify([
            { key: 'cart', vlu: sget('fj-cart') },
            { key: 'promo', vlu: sget('fj-promo') },
            { key: 'mode', vlu: orderMode },
            { key: 'store', vlu: el('ct-store').value },
            { key: 'time', vlu: el('ct-time').value },
            { key: 'name', vlu: el('ct-name').value },
            { key: 'phone', vlu: el('ct-phone').value },
            { key: 'email', vlu: el('ct-email').value },
            { key: 'address', vlu: el('ct-address').value }
        ]));
    }

    function placed() {
        setCart('', 0, '$0.00');
        setPromo('');
        el('ct-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function pickPkg(key) {
        el('ct-pkg').value = key;
        el('quote').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function quote() {
        $ApiRequest('Catering/Quote', JSON.stringify([
            { key: 'pkg', vlu: el('ct-pkg').value },
            { key: 'guests', vlu: el('ct-guests').value },
            { key: 'addons', vlu: picked('ct-cad') }
        ]));
    }

    function quoted(key, guests) {
        el('ct-rpkg').value = key;
        el('ct-rguests').value = String(guests);
    }

    function request() {
        $WaitOn();
        $ApiRequest('Catering/Send', JSON.stringify([
            { key: 'name', vlu: el('ct-name').value },
            { key: 'email', vlu: el('ct-email').value },
            { key: 'phone', vlu: el('ct-phone').value },
            { key: 'date', vlu: el('ct-date').value },
            { key: 'guests', vlu: el('ct-rguests').value },
            { key: 'pkg', vlu: el('ct-rpkg').value },
            { key: 'notes', vlu: el('ct-notes').value }
        ]));
    }

    function points() {
        $ApiRequest('Catering/Points', JSON.stringify([
            { key: 'spend', vlu: el('ct-spend').value },
            { key: 'visits', vlu: el('ct-visits').value }
        ]));
    }

    function join() {
        $WaitOn();
        $ApiRequest('Catering/Join', JSON.stringify([
            { key: 'name', vlu: el('ct-name').value },
            { key: 'email', vlu: el('ct-email').value },
            { key: 'month', vlu: el('ct-month').value },
            { key: 'agree', vlu: el('ct-agree').checked ? '1' : '' }
        ]));
    }

    function feature(btn, key) {
        var chips = btn.parentNode.querySelectorAll('.ct-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('ct-act');
        }
        btn.classList.add('ct-act');
        $ApiRequest('Catering/Filter', JSON.stringify([{ key: 'feat', vlu: key }]));
    }

    function store(key) {
        $ApiRequest('Catering/View', JSON.stringify([{ key: 'key', vlu: key }]));
    }

    function pick(key) {
        var n = document.querySelectorAll('.ct-st, .ct-pin');
        for (var i = 0; i < n.length; i++) {
            n[i].classList.toggle('ct-act', n[i].getAttribute('data-k') === key);
        }
    }

    function send() {
        $WaitOn();
        $ApiRequest('Catering/Send', JSON.stringify([
            { key: 'name', vlu: el('ct-name').value },
            { key: 'email', vlu: el('ct-email').value },
            { key: 'topic', vlu: el('ct-topic').value },
            { key: 'store', vlu: el('ct-store').value },
            { key: 'message', vlu: el('ct-msg').value }
        ]));
    }

    function sent() {
        var f = el('ct-form');
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
        $ApiRequest('Catering/Subscribe', JSON.stringify([{ key: 'email', vlu: el('ct-nl-email').value }]));
    }

    function subscribed() {
        el('ct-nl-email').value = '';
    }

    function reveal() {
        badge();
        document.addEventListener('click', function (e) {
            var box = el('ct-search');
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
            var h = el('ct-head');
            if (h) {
                h.classList.toggle('ct-scrolled', window.pageYOffset > 8);
            }
        }, { passive: true });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 767) {
                closeNav();
            }
        });
        if (page() === 'Order') {
            el('ct-code').value = sget('fj-promo');
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
    document.addEventListener('DOMContentLoaded', CateringJs.reveal);
} else {
    CateringJs.reveal();
}
