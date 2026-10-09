var MenuJs = (function () {

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
        el('mn-nav').classList.add('mn-open');
        el('mn-scrim').classList.add('mn-open');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        el('mn-nav').classList.remove('mn-open');
        el('mn-scrim').classList.remove('mn-open');
        document.body.style.overflow = '';
    }

    function toggleSub(btn) {
        var li = btn.closest('.mn-mi');
        if (li) {
            li.classList.toggle('mn-exp');
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
            if (q === lastQ && el('mn-sugg').innerHTML !== '') {
                openSugg();
                return;
            }
            lastQ = q;
            $ApiRequest('Menu/Search', JSON.stringify([{ key: 'q', vlu: q }]));
        }, 250);
    }

    function openSugg() {
        el('mn-sugg').classList.add('mn-open');
    }

    function closeSugg() {
        el('mn-sugg').classList.remove('mn-open');
    }

    function page() {
        var s = document.querySelector('.mn-site');
        return s ? s.getAttribute('data-page') : '';
    }

    function badge() {
        var n = parseInt(sget('fj-count'), 10) || 0;
        var b = el('mn-badge');
        if (b) {
            b.textContent = String(n);
            b.classList.toggle('mn-has', n > 0);
        }
        var bar = el('mn-cartbar');
        if (bar) {
            bar.classList.toggle('mn-show', n > 0 && page() !== 'Order');
            el('mn-cartbar-t').textContent = 'View order (' + n + (n === 1 ? ' item)' : ' items)');
            el('mn-cartbar-p').textContent = sget('fj-total');
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
        var c = el('mn-code');
        if (c) {
            c.value = code;
        }
    }

    function toast() {
        var t = el('mn-toast');
        t.classList.add('mn-open');
        clearTimeout(ttimer);
        ttimer = setTimeout(function () {
            t.classList.remove('mn-open');
        }, 3600);
    }

    function quick(id) {
        $ApiRequest('Menu/Quick', JSON.stringify([{ key: 'cart', vlu: sget('fj-cart') }, { key: 'id', vlu: id }]));
    }

    function apply(code) {
        $ApiRequest('Menu/Apply', JSON.stringify([{ key: 'code', vlu: code }]));
    }

    function values() {
        var list = [];
        var fields = document.querySelectorAll('.mn-fv');
        for (var i = 0; i < fields.length; i++) {
            list.push({ key: fields[i].getAttribute('data-k'), vlu: (fields[i].value || '').trim() });
        }
        return list;
    }

    function filter() {
        $WaitOn();
        $ApiRequest('Menu/Filter', JSON.stringify(values()));
    }

    function chip(btn, value) {
        var chips = btn.parentNode.querySelectorAll('.mn-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('mn-act');
        }
        btn.classList.add('mn-act');
        el('mn-f-cat').value = value;
        filter();
    }

    function diet(btn) {
        btn.classList.toggle('mn-act');
        var on = document.querySelectorAll('.mn-chip-t.mn-act');
        var list = [];
        for (var i = 0; i < on.length; i++) {
            list.push(on[i].getAttribute('data-d'));
        }
        el('mn-f-diet').value = list.join('.');
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
        var size = document.querySelector('input[name="mn-size"]:checked');
        return [
            { key: 'id', vlu: el('mn-id').value },
            { key: 'size', vlu: size ? size.value : '' },
            { key: 'addons', vlu: picked('mn-ad') },
            { key: 'removes', vlu: picked('mn-rm') },
            { key: 'qty', vlu: el('mn-qty').value }
        ];
    }

    function custom() {
        $ApiRequest('Menu/Customize', JSON.stringify(itemData()));
    }

    function qty(d) {
        var q = el('mn-qty');
        var v = Math.max(1, Math.min(20, (parseInt(q.value, 10) || 1) + d));
        q.value = String(v);
        custom();
    }

    function add() {
        $ApiRequest('Menu/Add', JSON.stringify(itemData().concat([{ key: 'cart', vlu: sget('fj-cart') }])));
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
        $ApiRequest('Menu/Update', JSON.stringify(orderData(op, idx)));
    }

    function promo() {
        $ApiRequest('Menu/Promo', JSON.stringify(orderData('', 0).concat([{ key: 'code', vlu: el('mn-code').value }])));
    }

    function dropPromo() {
        setPromo('');
        el('mn-promo-msg').innerHTML = '';
        update('', 0);
    }

    function mode(m) {
        orderMode = m;
        var b = document.querySelectorAll('.mn-seg-b');
        for (var i = 0; i < b.length; i++) {
            b[i].classList.toggle('mn-act', b[i].getAttribute('data-m') === m);
        }
        el('mn-addr').classList.toggle('mn-show', m === 'delivery');
        update('', 0);
    }

    function cartState(n) {
        el('mn-place').classList.toggle('mn-off', n === 0);
    }

    function place() {
        $WaitOn();
        $ApiRequest('Menu/Place', JSON.stringify([
            { key: 'cart', vlu: sget('fj-cart') },
            { key: 'promo', vlu: sget('fj-promo') },
            { key: 'mode', vlu: orderMode },
            { key: 'store', vlu: el('mn-store').value },
            { key: 'time', vlu: el('mn-time').value },
            { key: 'name', vlu: el('mn-name').value },
            { key: 'phone', vlu: el('mn-phone').value },
            { key: 'email', vlu: el('mn-email').value },
            { key: 'address', vlu: el('mn-address').value }
        ]));
    }

    function placed() {
        setCart('', 0, '$0.00');
        setPromo('');
        el('mn-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function pickPkg(key) {
        el('mn-pkg').value = key;
        el('quote').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function quote() {
        $ApiRequest('Menu/Quote', JSON.stringify([
            { key: 'pkg', vlu: el('mn-pkg').value },
            { key: 'guests', vlu: el('mn-guests').value },
            { key: 'addons', vlu: picked('mn-cad') }
        ]));
    }

    function quoted(key, guests) {
        el('mn-rpkg').value = key;
        el('mn-rguests').value = String(guests);
    }

    function request() {
        $WaitOn();
        $ApiRequest('Menu/Send', JSON.stringify([
            { key: 'name', vlu: el('mn-name').value },
            { key: 'email', vlu: el('mn-email').value },
            { key: 'phone', vlu: el('mn-phone').value },
            { key: 'date', vlu: el('mn-date').value },
            { key: 'guests', vlu: el('mn-rguests').value },
            { key: 'pkg', vlu: el('mn-rpkg').value },
            { key: 'notes', vlu: el('mn-notes').value }
        ]));
    }

    function points() {
        $ApiRequest('Menu/Points', JSON.stringify([
            { key: 'spend', vlu: el('mn-spend').value },
            { key: 'visits', vlu: el('mn-visits').value }
        ]));
    }

    function join() {
        $WaitOn();
        $ApiRequest('Menu/Join', JSON.stringify([
            { key: 'name', vlu: el('mn-name').value },
            { key: 'email', vlu: el('mn-email').value },
            { key: 'month', vlu: el('mn-month').value },
            { key: 'agree', vlu: el('mn-agree').checked ? '1' : '' }
        ]));
    }

    function feature(btn, key) {
        var chips = btn.parentNode.querySelectorAll('.mn-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('mn-act');
        }
        btn.classList.add('mn-act');
        $ApiRequest('Menu/Filter', JSON.stringify([{ key: 'feat', vlu: key }]));
    }

    function store(key) {
        $ApiRequest('Menu/View', JSON.stringify([{ key: 'key', vlu: key }]));
    }

    function pick(key) {
        var n = document.querySelectorAll('.mn-st, .mn-pin');
        for (var i = 0; i < n.length; i++) {
            n[i].classList.toggle('mn-act', n[i].getAttribute('data-k') === key);
        }
    }

    function send() {
        $WaitOn();
        $ApiRequest('Menu/Send', JSON.stringify([
            { key: 'name', vlu: el('mn-name').value },
            { key: 'email', vlu: el('mn-email').value },
            { key: 'topic', vlu: el('mn-topic').value },
            { key: 'store', vlu: el('mn-store').value },
            { key: 'message', vlu: el('mn-msg').value }
        ]));
    }

    function sent() {
        var f = el('mn-form');
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
        $ApiRequest('Menu/Subscribe', JSON.stringify([{ key: 'email', vlu: el('mn-nl-email').value }]));
    }

    function subscribed() {
        el('mn-nl-email').value = '';
    }

    function reveal() {
        badge();
        document.addEventListener('click', function (e) {
            var box = el('mn-search');
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
            var h = el('mn-head');
            if (h) {
                h.classList.toggle('mn-scrolled', window.pageYOffset > 8);
            }
        }, { passive: true });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 767) {
                closeNav();
            }
        });
        if (page() === 'Order') {
            el('mn-code').value = sget('fj-promo');
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
    document.addEventListener('DOMContentLoaded', MenuJs.reveal);
} else {
    MenuJs.reveal();
}
