var DealsJs = (function () {

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
        el('dl-nav').classList.add('dl-open');
        el('dl-scrim').classList.add('dl-open');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        el('dl-nav').classList.remove('dl-open');
        el('dl-scrim').classList.remove('dl-open');
        document.body.style.overflow = '';
    }

    function toggleSub(btn) {
        var li = btn.closest('.dl-mi');
        if (li) {
            li.classList.toggle('dl-exp');
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
            if (q === lastQ && el('dl-sugg').innerHTML !== '') {
                openSugg();
                return;
            }
            lastQ = q;
            $ApiRequest('Deals/Search', JSON.stringify([{ key: 'q', vlu: q }]));
        }, 250);
    }

    function openSugg() {
        el('dl-sugg').classList.add('dl-open');
    }

    function closeSugg() {
        el('dl-sugg').classList.remove('dl-open');
    }

    function page() {
        var s = document.querySelector('.dl-site');
        return s ? s.getAttribute('data-page') : '';
    }

    function badge() {
        var n = parseInt(sget('fj-count'), 10) || 0;
        var b = el('dl-badge');
        if (b) {
            b.textContent = String(n);
            b.classList.toggle('dl-has', n > 0);
        }
        var bar = el('dl-cartbar');
        if (bar) {
            bar.classList.toggle('dl-show', n > 0 && page() !== 'Order');
            el('dl-cartbar-t').textContent = 'View order (' + n + (n === 1 ? ' item)' : ' items)');
            el('dl-cartbar-p').textContent = sget('fj-total');
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
        var c = el('dl-code');
        if (c) {
            c.value = code;
        }
    }

    function toast() {
        var t = el('dl-toast');
        t.classList.add('dl-open');
        clearTimeout(ttimer);
        ttimer = setTimeout(function () {
            t.classList.remove('dl-open');
        }, 3600);
    }

    function quick(id) {
        $ApiRequest('Deals/Quick', JSON.stringify([{ key: 'cart', vlu: sget('fj-cart') }, { key: 'id', vlu: id }]));
    }

    function apply(code) {
        $ApiRequest('Deals/Apply', JSON.stringify([{ key: 'code', vlu: code }]));
    }

    function values() {
        var list = [];
        var fields = document.querySelectorAll('.dl-fv');
        for (var i = 0; i < fields.length; i++) {
            list.push({ key: fields[i].getAttribute('data-k'), vlu: (fields[i].value || '').trim() });
        }
        return list;
    }

    function filter() {
        $WaitOn();
        $ApiRequest('Deals/Filter', JSON.stringify(values()));
    }

    function chip(btn, value) {
        var chips = btn.parentNode.querySelectorAll('.dl-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('dl-act');
        }
        btn.classList.add('dl-act');
        el('dl-f-cat').value = value;
        filter();
    }

    function diet(btn) {
        btn.classList.toggle('dl-act');
        var on = document.querySelectorAll('.dl-chip-t.dl-act');
        var list = [];
        for (var i = 0; i < on.length; i++) {
            list.push(on[i].getAttribute('data-d'));
        }
        el('dl-f-diet').value = list.join('.');
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
        var size = document.querySelector('input[name="dl-size"]:checked');
        return [
            { key: 'id', vlu: el('dl-id').value },
            { key: 'size', vlu: size ? size.value : '' },
            { key: 'addons', vlu: picked('dl-ad') },
            { key: 'removes', vlu: picked('dl-rm') },
            { key: 'qty', vlu: el('dl-qty').value }
        ];
    }

    function custom() {
        $ApiRequest('Deals/Customize', JSON.stringify(itemData()));
    }

    function qty(d) {
        var q = el('dl-qty');
        var v = Math.max(1, Math.min(20, (parseInt(q.value, 10) || 1) + d));
        q.value = String(v);
        custom();
    }

    function add() {
        $ApiRequest('Deals/Add', JSON.stringify(itemData().concat([{ key: 'cart', vlu: sget('fj-cart') }])));
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
        $ApiRequest('Deals/Update', JSON.stringify(orderData(op, idx)));
    }

    function promo() {
        $ApiRequest('Deals/Promo', JSON.stringify(orderData('', 0).concat([{ key: 'code', vlu: el('dl-code').value }])));
    }

    function dropPromo() {
        setPromo('');
        el('dl-promo-msg').innerHTML = '';
        update('', 0);
    }

    function mode(m) {
        orderMode = m;
        var b = document.querySelectorAll('.dl-seg-b');
        for (var i = 0; i < b.length; i++) {
            b[i].classList.toggle('dl-act', b[i].getAttribute('data-m') === m);
        }
        el('dl-addr').classList.toggle('dl-show', m === 'delivery');
        update('', 0);
    }

    function cartState(n) {
        el('dl-place').classList.toggle('dl-off', n === 0);
    }

    function place() {
        $WaitOn();
        $ApiRequest('Deals/Place', JSON.stringify([
            { key: 'cart', vlu: sget('fj-cart') },
            { key: 'promo', vlu: sget('fj-promo') },
            { key: 'mode', vlu: orderMode },
            { key: 'store', vlu: el('dl-store').value },
            { key: 'time', vlu: el('dl-time').value },
            { key: 'name', vlu: el('dl-name').value },
            { key: 'phone', vlu: el('dl-phone').value },
            { key: 'email', vlu: el('dl-email').value },
            { key: 'address', vlu: el('dl-address').value }
        ]));
    }

    function placed() {
        setCart('', 0, '$0.00');
        setPromo('');
        el('dl-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function pickPkg(key) {
        el('dl-pkg').value = key;
        el('quote').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function quote() {
        $ApiRequest('Deals/Quote', JSON.stringify([
            { key: 'pkg', vlu: el('dl-pkg').value },
            { key: 'guests', vlu: el('dl-guests').value },
            { key: 'addons', vlu: picked('dl-cad') }
        ]));
    }

    function quoted(key, guests) {
        el('dl-rpkg').value = key;
        el('dl-rguests').value = String(guests);
    }

    function request() {
        $WaitOn();
        $ApiRequest('Deals/Send', JSON.stringify([
            { key: 'name', vlu: el('dl-name').value },
            { key: 'email', vlu: el('dl-email').value },
            { key: 'phone', vlu: el('dl-phone').value },
            { key: 'date', vlu: el('dl-date').value },
            { key: 'guests', vlu: el('dl-rguests').value },
            { key: 'pkg', vlu: el('dl-rpkg').value },
            { key: 'notes', vlu: el('dl-notes').value }
        ]));
    }

    function points() {
        $ApiRequest('Deals/Points', JSON.stringify([
            { key: 'spend', vlu: el('dl-spend').value },
            { key: 'visits', vlu: el('dl-visits').value }
        ]));
    }

    function join() {
        $WaitOn();
        $ApiRequest('Deals/Join', JSON.stringify([
            { key: 'name', vlu: el('dl-name').value },
            { key: 'email', vlu: el('dl-email').value },
            { key: 'month', vlu: el('dl-month').value },
            { key: 'agree', vlu: el('dl-agree').checked ? '1' : '' }
        ]));
    }

    function feature(btn, key) {
        var chips = btn.parentNode.querySelectorAll('.dl-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('dl-act');
        }
        btn.classList.add('dl-act');
        $ApiRequest('Deals/Filter', JSON.stringify([{ key: 'feat', vlu: key }]));
    }

    function store(key) {
        $ApiRequest('Deals/View', JSON.stringify([{ key: 'key', vlu: key }]));
    }

    function pick(key) {
        var n = document.querySelectorAll('.dl-st, .dl-pin');
        for (var i = 0; i < n.length; i++) {
            n[i].classList.toggle('dl-act', n[i].getAttribute('data-k') === key);
        }
    }

    function send() {
        $WaitOn();
        $ApiRequest('Deals/Send', JSON.stringify([
            { key: 'name', vlu: el('dl-name').value },
            { key: 'email', vlu: el('dl-email').value },
            { key: 'topic', vlu: el('dl-topic').value },
            { key: 'store', vlu: el('dl-store').value },
            { key: 'message', vlu: el('dl-msg').value }
        ]));
    }

    function sent() {
        var f = el('dl-form');
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
        $ApiRequest('Deals/Subscribe', JSON.stringify([{ key: 'email', vlu: el('dl-nl-email').value }]));
    }

    function subscribed() {
        el('dl-nl-email').value = '';
    }

    function reveal() {
        badge();
        document.addEventListener('click', function (e) {
            var box = el('dl-search');
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
            var h = el('dl-head');
            if (h) {
                h.classList.toggle('dl-scrolled', window.pageYOffset > 8);
            }
        }, { passive: true });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 767) {
                closeNav();
            }
        });
        if (page() === 'Order') {
            el('dl-code').value = sget('fj-promo');
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
    document.addEventListener('DOMContentLoaded', DealsJs.reveal);
} else {
    DealsJs.reveal();
}
