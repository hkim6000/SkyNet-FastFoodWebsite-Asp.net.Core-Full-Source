var RewardsJs = (function () {

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
        el('rw-nav').classList.add('rw-open');
        el('rw-scrim').classList.add('rw-open');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        el('rw-nav').classList.remove('rw-open');
        el('rw-scrim').classList.remove('rw-open');
        document.body.style.overflow = '';
    }

    function toggleSub(btn) {
        var li = btn.closest('.rw-mi');
        if (li) {
            li.classList.toggle('rw-exp');
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
            if (q === lastQ && el('rw-sugg').innerHTML !== '') {
                openSugg();
                return;
            }
            lastQ = q;
            $ApiRequest('Rewards/Search', JSON.stringify([{ key: 'q', vlu: q }]));
        }, 250);
    }

    function openSugg() {
        el('rw-sugg').classList.add('rw-open');
    }

    function closeSugg() {
        el('rw-sugg').classList.remove('rw-open');
    }

    function page() {
        var s = document.querySelector('.rw-site');
        return s ? s.getAttribute('data-page') : '';
    }

    function badge() {
        var n = parseInt(sget('fj-count'), 10) || 0;
        var b = el('rw-badge');
        if (b) {
            b.textContent = String(n);
            b.classList.toggle('rw-has', n > 0);
        }
        var bar = el('rw-cartbar');
        if (bar) {
            bar.classList.toggle('rw-show', n > 0 && page() !== 'Order');
            el('rw-cartbar-t').textContent = 'View order (' + n + (n === 1 ? ' item)' : ' items)');
            el('rw-cartbar-p').textContent = sget('fj-total');
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
        var c = el('rw-code');
        if (c) {
            c.value = code;
        }
    }

    function toast() {
        var t = el('rw-toast');
        t.classList.add('rw-open');
        clearTimeout(ttimer);
        ttimer = setTimeout(function () {
            t.classList.remove('rw-open');
        }, 3600);
    }

    function quick(id) {
        $ApiRequest('Rewards/Quick', JSON.stringify([{ key: 'cart', vlu: sget('fj-cart') }, { key: 'id', vlu: id }]));
    }

    function apply(code) {
        $ApiRequest('Rewards/Apply', JSON.stringify([{ key: 'code', vlu: code }]));
    }

    function values() {
        var list = [];
        var fields = document.querySelectorAll('.rw-fv');
        for (var i = 0; i < fields.length; i++) {
            list.push({ key: fields[i].getAttribute('data-k'), vlu: (fields[i].value || '').trim() });
        }
        return list;
    }

    function filter() {
        $WaitOn();
        $ApiRequest('Rewards/Filter', JSON.stringify(values()));
    }

    function chip(btn, value) {
        var chips = btn.parentNode.querySelectorAll('.rw-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('rw-act');
        }
        btn.classList.add('rw-act');
        el('rw-f-cat').value = value;
        filter();
    }

    function diet(btn) {
        btn.classList.toggle('rw-act');
        var on = document.querySelectorAll('.rw-chip-t.rw-act');
        var list = [];
        for (var i = 0; i < on.length; i++) {
            list.push(on[i].getAttribute('data-d'));
        }
        el('rw-f-diet').value = list.join('.');
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
        var size = document.querySelector('input[name="rw-size"]:checked');
        return [
            { key: 'id', vlu: el('rw-id').value },
            { key: 'size', vlu: size ? size.value : '' },
            { key: 'addons', vlu: picked('rw-ad') },
            { key: 'removes', vlu: picked('rw-rm') },
            { key: 'qty', vlu: el('rw-qty').value }
        ];
    }

    function custom() {
        $ApiRequest('Rewards/Customize', JSON.stringify(itemData()));
    }

    function qty(d) {
        var q = el('rw-qty');
        var v = Math.max(1, Math.min(20, (parseInt(q.value, 10) || 1) + d));
        q.value = String(v);
        custom();
    }

    function add() {
        $ApiRequest('Rewards/Add', JSON.stringify(itemData().concat([{ key: 'cart', vlu: sget('fj-cart') }])));
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
        $ApiRequest('Rewards/Update', JSON.stringify(orderData(op, idx)));
    }

    function promo() {
        $ApiRequest('Rewards/Promo', JSON.stringify(orderData('', 0).concat([{ key: 'code', vlu: el('rw-code').value }])));
    }

    function dropPromo() {
        setPromo('');
        el('rw-promo-msg').innerHTML = '';
        update('', 0);
    }

    function mode(m) {
        orderMode = m;
        var b = document.querySelectorAll('.rw-seg-b');
        for (var i = 0; i < b.length; i++) {
            b[i].classList.toggle('rw-act', b[i].getAttribute('data-m') === m);
        }
        el('rw-addr').classList.toggle('rw-show', m === 'delivery');
        update('', 0);
    }

    function cartState(n) {
        el('rw-place').classList.toggle('rw-off', n === 0);
    }

    function place() {
        $WaitOn();
        $ApiRequest('Rewards/Place', JSON.stringify([
            { key: 'cart', vlu: sget('fj-cart') },
            { key: 'promo', vlu: sget('fj-promo') },
            { key: 'mode', vlu: orderMode },
            { key: 'store', vlu: el('rw-store').value },
            { key: 'time', vlu: el('rw-time').value },
            { key: 'name', vlu: el('rw-name').value },
            { key: 'phone', vlu: el('rw-phone').value },
            { key: 'email', vlu: el('rw-email').value },
            { key: 'address', vlu: el('rw-address').value }
        ]));
    }

    function placed() {
        setCart('', 0, '$0.00');
        setPromo('');
        el('rw-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function pickPkg(key) {
        el('rw-pkg').value = key;
        el('quote').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function quote() {
        $ApiRequest('Rewards/Quote', JSON.stringify([
            { key: 'pkg', vlu: el('rw-pkg').value },
            { key: 'guests', vlu: el('rw-guests').value },
            { key: 'addons', vlu: picked('rw-cad') }
        ]));
    }

    function quoted(key, guests) {
        el('rw-rpkg').value = key;
        el('rw-rguests').value = String(guests);
    }

    function request() {
        $WaitOn();
        $ApiRequest('Rewards/Send', JSON.stringify([
            { key: 'name', vlu: el('rw-name').value },
            { key: 'email', vlu: el('rw-email').value },
            { key: 'phone', vlu: el('rw-phone').value },
            { key: 'date', vlu: el('rw-date').value },
            { key: 'guests', vlu: el('rw-rguests').value },
            { key: 'pkg', vlu: el('rw-rpkg').value },
            { key: 'notes', vlu: el('rw-notes').value }
        ]));
    }

    function points() {
        $ApiRequest('Rewards/Points', JSON.stringify([
            { key: 'spend', vlu: el('rw-spend').value },
            { key: 'visits', vlu: el('rw-visits').value }
        ]));
    }

    function join() {
        $WaitOn();
        $ApiRequest('Rewards/Join', JSON.stringify([
            { key: 'name', vlu: el('rw-name').value },
            { key: 'email', vlu: el('rw-email').value },
            { key: 'month', vlu: el('rw-month').value },
            { key: 'agree', vlu: el('rw-agree').checked ? '1' : '' }
        ]));
    }

    function feature(btn, key) {
        var chips = btn.parentNode.querySelectorAll('.rw-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.remove('rw-act');
        }
        btn.classList.add('rw-act');
        $ApiRequest('Rewards/Filter', JSON.stringify([{ key: 'feat', vlu: key }]));
    }

    function store(key) {
        $ApiRequest('Rewards/View', JSON.stringify([{ key: 'key', vlu: key }]));
    }

    function pick(key) {
        var n = document.querySelectorAll('.rw-st, .rw-pin');
        for (var i = 0; i < n.length; i++) {
            n[i].classList.toggle('rw-act', n[i].getAttribute('data-k') === key);
        }
    }

    function send() {
        $WaitOn();
        $ApiRequest('Rewards/Send', JSON.stringify([
            { key: 'name', vlu: el('rw-name').value },
            { key: 'email', vlu: el('rw-email').value },
            { key: 'topic', vlu: el('rw-topic').value },
            { key: 'store', vlu: el('rw-store').value },
            { key: 'message', vlu: el('rw-msg').value }
        ]));
    }

    function sent() {
        var f = el('rw-form');
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
        $ApiRequest('Rewards/Subscribe', JSON.stringify([{ key: 'email', vlu: el('rw-nl-email').value }]));
    }

    function subscribed() {
        el('rw-nl-email').value = '';
    }

    function reveal() {
        badge();
        document.addEventListener('click', function (e) {
            var box = el('rw-search');
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
            var h = el('rw-head');
            if (h) {
                h.classList.toggle('rw-scrolled', window.pageYOffset > 8);
            }
        }, { passive: true });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 767) {
                closeNav();
            }
        });
        if (page() === 'Order') {
            el('rw-code').value = sget('fj-promo');
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

RewardsJs.reveal();
