var ItemJs = (function () {

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
        el('it-nav').classList.add('it-open');
        el('it-scrim').classList.add('it-open');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        el('it-nav').classList.remove('it-open');
        el('it-scrim').classList.remove('it-open');
        document.body.style.overflow = '';
    }

    function toggleSub(btn) {
        var li = btn.closest('.it-mi');
        if (li) {
            li.classList.toggle('it-exp');
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
            if (q === lastQ && el('it-sugg').innerHTML !== '') {
                openSugg();
                return;
            }
            lastQ = q;
            $ApiRequest('Item/Search', JSON.stringify([{ key: 'q', vlu: q }]));
        }, 250);
    }

    function openSugg() {
        el('it-sugg').classList.add('it-open');
    }

    function closeSugg() {
        el('it-sugg').classList.remove('it-open');
    }

    function page() {
        var s = document.querySelector('.it-site');
        return s ? s.getAttribute('data-page') : '';
    }

    function badge() {
        var n = parseInt(sget('fj-count'), 10) || 0;
        var b = el('it-badge');
        if (b) {
            b.textContent = String(n);
            b.classList.toggle('it-has', n > 0);
        }
        var bar = el('it-cartbar');
        if (bar) {
            bar.classList.toggle('it-show', n > 0 && page() !== 'Order');
            el('it-cartbar-t').textContent = 'View order (' + n + (n === 1 ? ' item)' : ' items)');
            el('it-cartbar-p').textContent = sget('fj-total');
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
        var c = el('it-code');
        if (c) {
            c.value = code;
        }
    }

    function toast() {
        var t = el('it-toast');
        t.classList.add('it-open');
        clearTimeout(ttimer);
        ttimer = setTimeout(function () {
            t.classList.remove('it-open');
        }, 3600);
    }

    function quick(id) {
        $ApiRequest('Item/Quick', JSON.stringify([{ key: 'cart', vlu: sget('fj-cart') }, { key: 'id', vlu: id }]));
    }

    function apply(code) {
        $ApiRequest('Item/Apply', JSON.stringify([{ key: 'code', vlu: code }]));
    }

    function values() {
        var list = [];
        var fields = document.querySelectorAll('.it-fv');
        for (var i = 0; i < fields.length; i++) {
            list.push({ key: fields[i].getAttribute('data-k'), vlu: (fields[i].value || '').trim() });
        }
        return list;
    }

    function filter() {
        $WaitOn();
        $ApiRequest('Item/Filter', JSON.stringify(values()));
    }

    function chip(btn, value) {
        var chips = btn.parentNode.querySelectorAll('.it-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('it-act');
        }
        btn.classList.add('it-act');
        el('it-f-cat').value = value;
        filter();
    }

    function diet(btn) {
        btn.classList.toggle('it-act');
        var on = document.querySelectorAll('.it-chip-t.it-act');
        var list = [];
        for (var i = 0; i < on.length; i++) {
            list.push(on[i].getAttribute('data-d'));
        }
        el('it-f-diet').value = list.join('.');
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
        var size = document.querySelector('input[name="it-size"]:checked');
        return [
            { key: 'id', vlu: el('it-id').value },
            { key: 'size', vlu: size ? size.value : '' },
            { key: 'addons', vlu: picked('it-ad') },
            { key: 'removes', vlu: picked('it-rm') },
            { key: 'qty', vlu: el('it-qty').value }
        ];
    }

    function custom() {
        $ApiRequest('Item/Customize', JSON.stringify(itemData()));
    }

    function qty(d) {
        var q = el('it-qty');
        var v = Math.max(1, Math.min(20, (parseInt(q.value, 10) || 1) + d));
        q.value = String(v);
        custom();
    }

    function add() {
        $ApiRequest('Item/Add', JSON.stringify(itemData().concat([{ key: 'cart', vlu: sget('fj-cart') }])));
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
        $ApiRequest('Item/Update', JSON.stringify(orderData(op, idx)));
    }

    function promo() {
        $ApiRequest('Item/Promo', JSON.stringify(orderData('', 0).concat([{ key: 'code', vlu: el('it-code').value }])));
    }

    function dropPromo() {
        setPromo('');
        el('it-promo-msg').innerHTML = '';
        update('', 0);
    }

    function mode(m) {
        orderMode = m;
        var b = document.querySelectorAll('.it-seg-b');
        for (var i = 0; i < b.length; i++) {
            b[i].classList.toggle('it-act', b[i].getAttribute('data-m') === m);
        }
        el('it-addr').classList.toggle('it-show', m === 'delivery');
        update('', 0);
    }

    function cartState(n) {
        el('it-place').classList.toggle('it-off', n === 0);
    }

    function place() {
        $WaitOn();
        $ApiRequest('Item/Place', JSON.stringify([
            { key: 'cart', vlu: sget('fj-cart') },
            { key: 'promo', vlu: sget('fj-promo') },
            { key: 'mode', vlu: orderMode },
            { key: 'store', vlu: el('it-store').value },
            { key: 'time', vlu: el('it-time').value },
            { key: 'name', vlu: el('it-name').value },
            { key: 'phone', vlu: el('it-phone').value },
            { key: 'email', vlu: el('it-email').value },
            { key: 'address', vlu: el('it-address').value }
        ]));
    }

    function placed() {
        setCart('', 0, '$0.00');
        setPromo('');
        el('it-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function pickPkg(key) {
        el('it-pkg').value = key;
        el('quote').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function quote() {
        $ApiRequest('Item/Quote', JSON.stringify([
            { key: 'pkg', vlu: el('it-pkg').value },
            { key: 'guests', vlu: el('it-guests').value },
            { key: 'addons', vlu: picked('it-cad') }
        ]));
    }

    function quoted(key, guests) {
        el('it-rpkg').value = key;
        el('it-rguests').value = String(guests);
    }

    function request() {
        $WaitOn();
        $ApiRequest('Item/Send', JSON.stringify([
            { key: 'name', vlu: el('it-name').value },
            { key: 'email', vlu: el('it-email').value },
            { key: 'phone', vlu: el('it-phone').value },
            { key: 'date', vlu: el('it-date').value },
            { key: 'guests', vlu: el('it-rguests').value },
            { key: 'pkg', vlu: el('it-rpkg').value },
            { key: 'notes', vlu: el('it-notes').value }
        ]));
    }

    function points() {
        $ApiRequest('Item/Points', JSON.stringify([
            { key: 'spend', vlu: el('it-spend').value },
            { key: 'visits', vlu: el('it-visits').value }
        ]));
    }

    function join() {
        $WaitOn();
        $ApiRequest('Item/Join', JSON.stringify([
            { key: 'name', vlu: el('it-name').value },
            { key: 'email', vlu: el('it-email').value },
            { key: 'month', vlu: el('it-month').value },
            { key: 'agree', vlu: el('it-agree').checked ? '1' : '' }
        ]));
    }

    function feature(btn, key) {
        var chips = btn.parentNode.querySelectorAll('.it-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('it-act');
        }
        btn.classList.add('it-act');
        $ApiRequest('Item/Filter', JSON.stringify([{ key: 'feat', vlu: key }]));
    }

    function store(key) {
        $ApiRequest('Item/View', JSON.stringify([{ key: 'key', vlu: key }]));
    }

    function pick(key) {
        var n = document.querySelectorAll('.it-st, .it-pin');
        for (var i = 0; i < n.length; i++) {
            n[i].classList.toggle('it-act', n[i].getAttribute('data-k') === key);
        }
    }

    function send() {
        $WaitOn();
        $ApiRequest('Item/Send', JSON.stringify([
            { key: 'name', vlu: el('it-name').value },
            { key: 'email', vlu: el('it-email').value },
            { key: 'topic', vlu: el('it-topic').value },
            { key: 'store', vlu: el('it-store').value },
            { key: 'message', vlu: el('it-msg').value }
        ]));
    }

    function sent() {
        var f = el('it-form');
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
        $ApiRequest('Item/Subscribe', JSON.stringify([{ key: 'email', vlu: el('it-nl-email').value }]));
    }

    function subscribed() {
        el('it-nl-email').value = '';
    }

    function reveal() {
        badge();
        document.addEventListener('click', function (e) {
            var box = el('it-search');
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
            var h = el('it-head');
            if (h) {
                h.classList.toggle('it-scrolled', window.pageYOffset > 8);
            }
        }, { passive: true });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 767) {
                closeNav();
            }
        });
        if (page() === 'Order') {
            el('it-code').value = sget('fj-promo');
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
    document.addEventListener('DOMContentLoaded', ItemJs.reveal);
} else {
    ItemJs.reveal();
}
