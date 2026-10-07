using System.Globalization;
using System.Text;
using System.Text.Json;
using FastFood.Models;
using SkyNet;

namespace FastFood.codes
{
    public class Order : WebPage
    {
        public override async Task OnInitialized()
        {
            HtmlDoc.SetTitle("Order online | Flamejack Burgers");
            HtmlDoc.AddMetaElement("viewport", "width=device-width, initial-scale=1");
            HtmlDoc.AddMetaElement("description", "Order Flamejack for pickup or delivery.");

            SiteData site = await LoadSite();
            string store = Pick(QueryValue("store"), site.Stores.Select(s => s.Key));
            StringBuilder so = new StringBuilder("<option value=\"\">Choose a store</option>");
            foreach (Store s in site.Stores)
            {
                so.Append("<option value=\"" + s.Key + "\"" + (s.Key == store ? " selected" : string.Empty) + ">" + HtmlEncode(s.Name) + " &middot; " + HtmlEncode(s.Address) + "</option>");
            }
            StringBuilder to = new StringBuilder();
            foreach (KeyValuePair<string, string> t in Slots())
            {
                to.Append("<option value=\"" + t.Key + "\">" + HtmlEncode(t.Value) + "</option>");
            }
            HtmlDoc.HtmlBodyText = HtmlDoc.HtmlBodyText
                .Replace("{plhd_stores}", so.ToString())
                .Replace("{plhd_times}", to.ToString());
        }

        public async Task<ApiResponse> Update()
        {
            ApiResponse response = new ApiResponse();
            SiteData site = await LoadSite();
            List<CartLine> cart = ParseCart(site, GetDataValue("cart"));
            string op = Pick(GetDataValue("op"), new[] { "inc", "dec", "del", "clear" });
            int idx;
            int.TryParse(GetDataValue("idx"), out idx);
            if (op == "clear")
            {
                cart.Clear();
            }
            else if (op != string.Empty && idx >= 0 && idx < cart.Count)
            {
                if (op == "inc")
                {
                    cart[idx].Qty = Math.Min(20, cart[idx].Qty + 1);
                }
                else if (op == "dec" && cart[idx].Qty > 1)
                {
                    cart[idx].Qty--;
                }
                else
                {
                    cart.RemoveAt(idx);
                }
            }
            Render(response, site, cart);
            return response;
        }

        public async Task<ApiResponse> Promo()
        {
            ApiResponse response = new ApiResponse();
            SiteData site = await LoadSite();
            List<CartLine> cart = ParseCart(site, GetDataValue("cart"));
            string code = (GetDataValue("code") ?? string.Empty).Trim().ToUpperInvariant();
            Deal? d = site.Deals.FirstOrDefault(x => x.Code == code);
            if (d == null)
            {
                response.SetElementContents("od-promo-msg", "<span class=\"od-err\">" + (code == string.Empty ? "Enter a code first." : "We don&rsquo;t recognize &ldquo;" + HtmlEncode(code.Length > 12 ? code.Substring(0, 12) : code) + "&rdquo;. Check the Deals page.") + "</span>");
                return response;
            }
            response.ExecuteScript("OrderJs.setPromo('" + d.Code + "');");
            Render(response, site, cart, d.Code);
            return response;
        }

        public async Task<ApiResponse> Place()
        {
            ApiResponse response = new ApiResponse();
            SiteData site = await LoadSite();
            List<CartLine> cart = ParseCart(site, GetDataValue("cart"));
            string mode = Pick(GetDataValue("mode"), new[] { "pickup", "delivery" });
            string store = Pick(GetDataValue("store"), site.Stores.Select(s => s.Key));
            string time = (GetDataValue("time") ?? string.Empty).Trim();
            string name = (GetDataValue("name") ?? string.Empty).Trim();
            string phone = new string((GetDataValue("phone") ?? string.Empty).Where(char.IsDigit).ToArray());
            string email = (GetDataValue("email") ?? string.Empty).Trim();
            string address = (GetDataValue("address") ?? string.Empty).Trim();
            Dictionary<string, string> slots = Slots();

            string eCart = cart.Count == 0 ? "Your order is empty. Add something tasty first." : string.Empty;
            string eStore = store == string.Empty ? "Please choose a store." : string.Empty;
            string eTime = !slots.ContainsKey(time) ? "Please choose a time." : string.Empty;
            string eName = name.Length < 2 || name.Length > 60 ? "Please tell us your name." : string.Empty;
            string ePhone = phone.Length != 10 ? "Please enter a 10-digit phone number." : string.Empty;
            string eEmail = !IsEmail(email) ? "Please enter a valid email address." : string.Empty;
            string eAddr = mode == "delivery" && (address.Length < 6 || address.Length > 120) ? "Please enter a delivery address." : string.Empty;
            if (mode == string.Empty)
            {
                eStore = "Please choose pickup or delivery.";
            }

            response.SetElementContents("od-e-cart", eCart);
            response.SetElementContents("od-e-store", eStore);
            response.SetElementContents("od-e-time", eTime);
            response.SetElementContents("od-e-name", eName);
            response.SetElementContents("od-e-phone", ePhone);
            response.SetElementContents("od-e-email", eEmail);
            response.SetElementContents("od-e-address", eAddr);
            if (eCart + eStore + eTime + eName + ePhone + eEmail + eAddr != string.Empty)
            {
                response.SetElementContents("od-done", string.Empty);
                return response;
            }
            string promo = (GetDataValue("promo") ?? string.Empty).Trim().ToUpperInvariant();
            Totals t = Compute(site, cart, promo, mode);
            Store st = site.Stores.First(s => s.Key == store);
            int hash = Math.Abs((name + phone + t.Total.ToString(CultureInfo.InvariantCulture) + cart.Count).Aggregate(17, (h, c) => unchecked(h * 31 + c))) % 9000 + 1000;
            StringBuilder sb = new StringBuilder();
            sb.Append("<div class=\"od-done-h\"><span>&#10003;</span><div><b>Order FJ-" + hash + " received</b><small>Thanks, " + HtmlEncode(name) + "!</small></div></div>");
            sb.Append("<ul><li><span>" + (mode == "pickup" ? "Pickup at" : "Delivered from") + "</span><b>" + HtmlEncode(st.Name) + "</b></li><li><span>When</span><b>" + HtmlEncode(slots[time]) + "</b></li>");
            if (mode == "delivery")
            {
                sb.Append("<li><span>To</span><b>" + HtmlEncode(address) + "</b></li>");
            }
            sb.Append("<li><span>Items</span><b>" + cart.Sum(c => c.Qty) + "</b></li><li><span>Total</span><b>" + Money(t.Total) + "</b></li><li><span>Rewards</span><b>+" + Points(t.Total) + " points</b></li></ul>");
            sb.Append("<p>This is a demo: your order was checked on the server, but nothing was charged or sent to a kitchen.</p>");
            response.SetElementContents("od-done", sb.ToString());
            response.ExecuteScript("OrderJs.placed();");
            return response;
        }

        private void Render(ApiResponse response, SiteData site, List<CartLine> cart, string? promoOverride = null)
        {
            string mode = Pick(GetDataValue("mode"), new[] { "pickup", "delivery" });
            string promo = promoOverride ?? (GetDataValue("promo") ?? string.Empty).Trim().ToUpperInvariant();
            if (cart.Count == 0)
            {
                List<MenuItem> pop = site.Items.Where(i => i.Tags.Contains("popular")).OrderBy(i => i.Rank).Take(3).ToList();
                response.SetElementContents("od-lines", "<div class=\"od-bag-empty\"><b>Your order is empty</b><p>Start with a favorite &mdash; one tap adds it.</p><div class=\"od-items od-items-3\">" + ItemCards(site, pop) + "</div></div>");
                response.SetElementContents("od-totals", string.Empty);
                response.SetElementContents("od-promo-msg", string.Empty);
                response.ExecuteScript("OrderJs.cartState(0);");
                SendCart(response, site, cart);
                return;
            }
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < cart.Count; i++)
            {
                CartLine c = cart[i];
                sb.Append("<div class=\"od-line\"><img src=\"" + c.Item.Image + "\" alt=\"\"><div class=\"od-line-t\"><a href=\"Item?id=" + c.Item.Id + "\">" + HtmlEncode(c.Item.Name) + "</a>");
                sb.Append("<small>" + HtmlEncode(c.Detail == string.Empty ? "Classic" : c.Detail) + "</small><span>" + Money(c.Unit) + " each &middot; " + c.Calories + " cal</span></div>");
                sb.Append("<div class=\"od-qty\"><button type=\"button\" aria-label=\"Less\" onclick=\"OrderJs.update('dec'," + i + ")\">&minus;</button><b>" + c.Qty + "</b><button type=\"button\" aria-label=\"More\" onclick=\"OrderJs.update('inc'," + i + ")\">+</button></div>");
                sb.Append("<div class=\"od-line-p\"><b>" + Money(c.Unit * c.Qty) + "</b><button type=\"button\" onclick=\"OrderJs.update('del'," + i + ")\">Remove</button></div></div>");
            }
            Totals t = Compute(site, cart, promo, mode);
            StringBuilder tt = new StringBuilder();
            tt.Append("<div><span>Subtotal</span><b>" + Money(t.Sub) + "</b></div>");
            if (t.Code != string.Empty)
            {
                tt.Append("<div class=\"od-tot-d\"><span>" + t.Code + (t.Disc > 0 ? string.Empty : " (not yet)") + " <button type=\"button\" onclick=\"OrderJs.dropPromo()\">remove</button></span><b>" + (t.Disc > 0 ? "&minus;" + Money(t.Disc) : "$0.00") + "</b></div>");
            }
            if (mode == "delivery")
            {
                tt.Append("<div><span>Delivery" + (t.Fee == 0 ? " (free)" : string.Empty) + "</span><b>" + Money(t.Fee) + "</b></div>");
            }
            tt.Append("<div><span>Tax (7.5%)</span><b>" + Money(t.Tax) + "</b></div>");
            tt.Append("<div class=\"od-tot-g\"><span>Total</span><b>" + Money(t.Total) + "</b></div>");
            tt.Append("<div class=\"od-tot-p\">You&rsquo;ll earn <b>" + Points(t.Total) + " reward points</b> with this order.</div>");
            response.SetElementContents("od-lines", sb.ToString());
            response.SetElementContents("od-totals", tt.ToString());
            response.SetElementContents("od-promo-msg", t.Msg == string.Empty ? string.Empty : "<span class=\"" + (t.Disc > 0 || t.Code == "FREEDEL" && mode == "delivery" ? "od-ok" : "od-warn") + "\">" + t.Msg + "</span>");
            response.ExecuteScript("OrderJs.cartState(1);");
            SendCart(response, site, cart);
        }

        private static Dictionary<string, string> Slots()
        {
            Dictionary<string, string> d = new Dictionary<string, string> { { "asap", "ASAP (about 15–20 min)" } };
            for (int m = 11 * 60; m <= 21 * 60; m += 30)
            {
                int h = m / 60;
                string label = (h > 12 ? h - 12 : h) + ":" + (m % 60).ToString("00", CultureInfo.InvariantCulture) + (h >= 12 ? " PM" : " AM");
                d.Add((m / 60).ToString("00", CultureInfo.InvariantCulture) + (m % 60).ToString("00", CultureInfo.InvariantCulture), "Today at " + label);
            }
            return d;
        }

        private static int Points(decimal total)
        {
            return (int)Math.Floor(total) * 10;
        }

        public async Task<ApiResponse> Search()
        {
            ApiResponse response = new ApiResponse();
            string q = Clip(GetDataValue("q"));
            SiteData site = await LoadSite();
            List<string> rows = new List<string>();
            int total = 0;
            if (q.Length >= 2)
            {
                foreach (MenuItem i in site.Items.Where(i => Has(i.Name, q) || Has(i.Description, q) || Has(LabelOf(site.Categories, i.Category), q)).OrderBy(i => i.Rank))
                {
                    total++;
                    rows.Add(Sugg("Menu", i.Image, i.Name, Money(i.Price) + " · " + i.Calories + " cal", "Item?id=" + i.Id));
                }
                foreach (Deal d in site.Deals.Where(d => Has(d.Title, q) || Has(d.Code, q) || Has(d.Text, q)))
                {
                    total++;
                    rows.Add(Sugg("Deal", d.Image, d.Title, "Code " + d.Code, "Deals"));
                }
                foreach (Store s in site.Stores.Where(s => Has(s.Name, q) || Has(s.Address, q) || Has(s.City, q)))
                {
                    total++;
                    rows.Add(Sugg("Store", string.Empty, "Flamejack " + s.Name, s.Address + " · " + s.Hours, "Locations"));
                }
            }
            StringBuilder sb = new StringBuilder();
            if (total == 0)
            {
                sb.Append("<div class=\"od-sg-none\">No results for &ldquo;" + HtmlEncode(q) + "&rdquo;</div>");
            }
            else
            {
                foreach (string r in rows.Take(7))
                {
                    sb.Append(r);
                }
                sb.Append("<div class=\"od-sg-foot\">" + total + (total == 1 ? " result" : " results") + " across the menu, deals and stores</div>");
            }
            response.SetElementContents("od-sugg", sb.ToString());
            response.ExecuteScript("OrderJs.openSugg();");
            return response;
        }

        public async Task<ApiResponse> Quick()
        {
            ApiResponse response = new ApiResponse();
            SiteData site = await LoadSite();
            MenuItem? it = site.Items.FirstOrDefault(i => i.Id == (GetDataValue("id") ?? string.Empty).Trim());
            if (it == null)
            {
                return response;
            }
            CartLine line = MakeLine(site, it, DefaultSize(OptionsOf(site, it)), new List<string>(), new List<string>(), 1);
            List<CartLine> cart = Merge(ParseCart(site, GetDataValue("cart")), line);
            Toast(response, "<b>" + HtmlEncode(it.Name) + "</b> added to your order. <a href=\"Order\">View order &rarr;</a>");
            SendCart(response, site, cart);
            return response;
        }

        public async Task<ApiResponse> Apply()
        {
            ApiResponse response = new ApiResponse();
            SiteData site = await LoadSite();
            string code = (GetDataValue("code") ?? string.Empty).Trim().ToUpperInvariant();
            Deal? d = site.Deals.FirstOrDefault(x => x.Code == code);
            if (d == null)
            {
                Toast(response, "That deal has ended.");
                return response;
            }
            response.ExecuteScript("OrderJs.setPromo('" + d.Code + "');");
            Toast(response, "Code <b>" + d.Code + "</b> is on your order: " + HtmlEncode(d.Title.ToLowerInvariant()) + ". <a href=\"Order\">Go to order &rarr;</a>");
            return response;
        }

        public async Task<ApiResponse> Subscribe()
        {
            ApiResponse response = new ApiResponse();
            await Task.CompletedTask;
            string email = (GetDataValue("email") ?? string.Empty).Trim();
            if (!IsEmail(email))
            {
                response.SetElementContents("od-nl-msg", "<span class=\"od-err\">Please enter a valid email address.</span>");
                return response;
            }
            response.SetElementContents("od-nl-msg", "<span class=\"od-ok\">You&rsquo;re in! Deals go to " + HtmlEncode(email) + ". (Demo only &mdash; nothing was stored.)</span>");
            response.ExecuteScript("OrderJs.subscribed();");
            return response;
        }

        private static void Toast(ApiResponse response, string html)
        {
            response.SetElementContents("od-toast", html);
            response.ExecuteScript("OrderJs.toast();");
        }

        private static void SendCart(ApiResponse response, SiteData site, List<CartLine> cart)
        {
            decimal sub = cart.Sum(c => c.Unit * c.Qty);
            response.ExecuteScript("OrderJs.setCart('" + Serialize(cart) + "', " + cart.Sum(c => c.Qty) + ", '" + Money(sub) + "');");
        }

        private static OptionSet OptionsOf(SiteData site, MenuItem it)
        {
            return site.Options.FirstOrDefault(o => o.Key == it.Options) ?? new OptionSet();
        }

        private static string DefaultSize(OptionSet o)
        {
            if (o.Sizes.Count == 0)
            {
                return string.Empty;
            }
            Option? zero = o.Sizes.FirstOrDefault(s => s.Price == 0);
            return (zero ?? o.Sizes[0]).Key;
        }

        private static CartLine MakeLine(SiteData site, MenuItem it, string size, List<string> addons, List<string> removes, int qty)
        {
            OptionSet o = OptionsOf(site, it);
            Option? sz = o.Sizes.FirstOrDefault(s => s.Key == size) ?? o.Sizes.FirstOrDefault(s => s.Key == DefaultSize(o));
            List<Option> ad = o.Addons.Where(a => addons.Contains(a.Key)).ToList();
            List<Option> rm = o.Removes.Where(r => removes.Contains(r.Key)).ToList();
            List<string> parts = new List<string>();
            if (sz != null && sz.Key != DefaultSize(o))
            {
                parts.Add(sz.Label);
            }
            else if (sz != null && o.Sizes.Count > 0 && it.Category != "burgers")
            {
                parts.Add(sz.Label);
            }
            parts.AddRange(ad.Select(a => a.Key == "combo" ? "Combo" : "+ " + a.Label));
            parts.AddRange(rm.Select(r => r.Label));
            return new CartLine
            {
                Item = it,
                Size = sz == null ? string.Empty : sz.Key,
                Addons = ad.Select(a => a.Key).ToList(),
                Removes = rm.Select(r => r.Key).ToList(),
                Qty = Math.Clamp(qty, 1, 20),
                Unit = it.Price + (sz == null ? 0 : sz.Price) + ad.Sum(a => a.Price),
                Calories = Math.Max(0, it.Calories + (sz == null ? 0 : sz.Calories) + ad.Sum(a => a.Calories)),
                Detail = string.Join(" · ", parts)
            };
        }

        private static List<CartLine> ParseCart(SiteData site, string? raw)
        {
            List<CartLine> list = new List<CartLine>();
            foreach (string part in (raw ?? string.Empty).Split('|', StringSplitOptions.RemoveEmptyEntries).Take(30))
            {
                string[] f = part.Split('~');
                if (f.Length != 5)
                {
                    continue;
                }
                MenuItem? it = site.Items.FirstOrDefault(i => i.Id == f[0]);
                int qty;
                if (it == null || !int.TryParse(f[4], out qty) || qty < 1)
                {
                    continue;
                }
                CartLine line = MakeLine(site, it, f[1], f[2].Split('.', StringSplitOptions.RemoveEmptyEntries).ToList(), f[3].Split('.', StringSplitOptions.RemoveEmptyEntries).ToList(), qty);
                list = Merge(list, line);
            }
            return list;
        }

        private static List<CartLine> Merge(List<CartLine> list, CartLine line)
        {
            CartLine? same = list.FirstOrDefault(c => Key(c) == Key(line));
            if (same != null)
            {
                same.Qty = Math.Min(20, same.Qty + line.Qty);
            }
            else if (list.Count < 30)
            {
                list.Add(line);
            }
            return list;
        }

        private static string Key(CartLine c)
        {
            return c.Item.Id + "~" + c.Size + "~" + string.Join(".", c.Addons.OrderBy(x => x)) + "~" + string.Join(".", c.Removes.OrderBy(x => x));
        }

        private static string Serialize(List<CartLine> cart)
        {
            return string.Join("|", cart.Select(c => Key(c) + "~" + c.Qty));
        }

        private static Totals Compute(SiteData site, List<CartLine> cart, string code, string mode)
        {
            Totals t = new Totals();
            t.Sub = cart.Sum(c => c.Unit * c.Qty);
            Deal? d = site.Deals.FirstOrDefault(x => x.Code == code);
            bool freeDelivery = t.Sub >= 35m;
            if (d != null)
            {
                t.Code = d.Code;
                if (d.Kind == "percent" || d.Kind == "amount")
                {
                    if (t.Sub >= d.Min)
                    {
                        t.Disc = d.Kind == "percent" ? Math.Round(t.Sub * d.Value / 100m, 2) : Math.Min(d.Value, t.Sub);
                        t.Msg = d.Title + " applied.";
                    }
                    else
                    {
                        t.Msg = "Add " + Money(d.Min - t.Sub) + " more to use " + d.Code + ".";
                    }
                }
                else if (d.Kind == "free")
                {
                    bool burger = cart.Any(c => c.Item.Category == "burgers");
                    CartLine? fries = cart.Where(c => c.Item.Id == d.Item).OrderBy(c => c.Unit).FirstOrDefault();
                    if (burger && fries != null)
                    {
                        t.Disc = Math.Min(fries.Unit, site.Items.First(i => i.Id == d.Item).Price);
                        t.Msg = "Free Golden Fries applied.";
                    }
                    else
                    {
                        t.Msg = "Add a burger and Golden Fries to use " + d.Code + ".";
                    }
                }
                else if (d.Kind == "delivery")
                {
                    if (mode == "delivery")
                    {
                        freeDelivery = true;
                        t.Msg = "Free delivery applied.";
                    }
                    else
                    {
                        t.Msg = d.Code + " works on delivery orders.";
                    }
                }
                else if (d.Kind == "shake")
                {
                    List<decimal> units = new List<decimal>();
                    foreach (CartLine c in cart.Where(c => c.Item.Options == "shake"))
                    {
                        for (int i = 0; i < c.Qty; i++)
                        {
                            units.Add(c.Unit);
                        }
                    }
                    if (units.Count >= 2)
                    {
                        t.Disc = Math.Round(units.Min() * d.Value / 100m, 2);
                        t.Msg = "Second shake half price applied.";
                    }
                    else
                    {
                        t.Msg = "Add two shakes to use " + d.Code + ".";
                    }
                }
            }
            t.Fee = mode == "delivery" && !freeDelivery ? 3.99m : 0m;
            t.Tax = Math.Round((t.Sub - t.Disc) * 0.075m, 2);
            t.Total = t.Sub - t.Disc + t.Fee + t.Tax;
            return t;
        }

        private static string Sugg(string type, string img, string title, string sub, string href)
        {
            string pic = img == string.Empty ? "<span class=\"od-sg-i\">&#9679;</span>" : "<img src=\"" + img + "\" alt=\"\">";
            return "<a class=\"od-sg\" href=\"" + href + "\">" + pic + "<span><b>" + HtmlEncode(title) + "</b><small>" + type + " &middot; " + HtmlEncode(sub) + "</small></span></a>";
        }

        private async Task<SiteData> LoadSite()
        {
            string file = Path.Combine(DataPath ?? string.Empty, "site.json");
            if (!File.Exists(file))
            {
                file = Path.Combine(Directory.GetCurrentDirectory(), "data", "site.json");
            }
            if (!File.Exists(file))
            {
                return new SiteData();
            }
            string json = await File.ReadAllTextAsync(file);
            JsonSerializerOptions options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<SiteData>(json, options) ?? new SiteData();
        }

        private static string Clip(string? value)
        {
            string q = (value ?? string.Empty).Trim();
            return q.Length > 40 ? q.Substring(0, 40) : q;
        }

        private static string Pick(string? value, IEnumerable<string> allowed)
        {
            string v = (value ?? string.Empty).Trim().ToLowerInvariant();
            return allowed.Contains(v) ? v : string.Empty;
        }

        private static bool Has(string text, string q)
        {
            return (text ?? string.Empty).Contains(q, StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsEmail(string v)
        {
            if (v.Length < 5 || v.Length > 80 || v.Contains(' '))
            {
                return false;
            }
            int at = v.IndexOf('@');
            int dot = v.LastIndexOf('.');
            return at > 0 && at == v.LastIndexOf('@') && dot > at + 1 && dot < v.Length - 1;
        }

        private static string Money(decimal v)
        {
            return "$" + v.ToString("0.00", CultureInfo.InvariantCulture);
        }

        private static string CountText(int n, string one, string many)
        {
            return n + " " + (n == 1 ? one : many);
        }

        private static string LabelOf(List<KeyLabel> list, string key)
        {
            return list.Where(x => x.Key == key).Select(x => x.Label).FirstOrDefault() ?? key;
        }

        private static string Chips(List<KeyLabel> items, string active)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("<button type=\"button\" class=\"od-chip" + (active == string.Empty ? " od-act" : string.Empty) + "\" onclick=\"OrderJs.chip(this, '')\">All</button>");
            foreach (KeyLabel k in items)
            {
                sb.Append("<button type=\"button\" class=\"od-chip" + (k.Key == active ? " od-act" : string.Empty) + "\" onclick=\"OrderJs.chip(this, '" + k.Key + "')\">" + HtmlEncode(k.Label) + "</button>");
            }
            return sb.ToString();
        }

        private static string Badges(MenuItem i)
        {
            StringBuilder sb = new StringBuilder("<span class=\"od-badges\">");
            if (i.Tags.Contains("popular"))
            {
                sb.Append("<span class=\"od-bdg od-bdg-p\">Popular</span>");
            }
            if (i.Tags.Contains("spicy"))
            {
                sb.Append("<span class=\"od-bdg od-bdg-s\">Spicy</span>");
            }
            if (i.Tags.Contains("veg"))
            {
                sb.Append("<span class=\"od-bdg od-bdg-v\">Veg</span>");
            }
            return sb.Append("</span>").ToString();
        }

        private static string ItemCards(SiteData site, List<MenuItem> list)
        {
            StringBuilder sb = new StringBuilder();
            foreach (MenuItem i in list)
            {
                sb.Append("<article class=\"od-item\"><a class=\"od-item-img\" href=\"Item?id=" + i.Id + "\"><img src=\"" + i.Image + "\" alt=\"" + HtmlEncode(i.Name) + "\" loading=\"lazy\">" + Badges(i) + "</a>");
                sb.Append("<div class=\"od-item-b\"><h3><a href=\"Item?id=" + i.Id + "\">" + HtmlEncode(i.Name) + "</a></h3><p>" + HtmlEncode(i.Description) + "</p>");
                sb.Append("<div class=\"od-item-f\"><span><b>" + Money(i.Price) + "</b><small>" + i.Calories + " cal</small></span><a class=\"od-item-c\" href=\"Item?id=" + i.Id + "\">Customize</a><button type=\"button\" class=\"od-add\" aria-label=\"Add " + HtmlEncode(i.Name) + "\" onclick=\"OrderJs.quick('" + i.Id + "')\">+ Add</button></div></div></article>");
            }
            return sb.ToString();
        }

        private static string ItemGrid(SiteData site, List<MenuItem> list)
        {
            return ItemCards(site, list);
        }

        private static string StoreCard(SiteData site, Store s)
        {
            return "<a class=\"od-scard\" href=\"Locations\"><b>" + HtmlEncode(s.Name) + "</b><span>" + HtmlEncode(s.Address) + "</span><small>" + HtmlEncode(s.Hours) + "</small><em>" + string.Join(" &middot; ", s.Features.Take(3).Select(f => HtmlEncode(LabelOf(site.Features, f)))) + "</em></a>";
        }
    }
}
