using System.Globalization;
using System.Text;
using System.Text.Json;
using FastFood.Models;
using SkyNet;

namespace FastFood.codes
{
    public class Catering : WebPage
    {
        public override async Task OnInitialized()
        {
            HtmlDoc.SetTitle("Catering | Flamejack Burgers");
            HtmlDoc.AddMetaElement("viewport", "width=device-width, initial-scale=1");
            HtmlDoc.AddMetaElement("description", "Burger bars, slider parties and tender trays for 10 to 300 guests.");

            SiteData site = await LoadSite();
            StringBuilder cards = new StringBuilder();
            StringBuilder po = new StringBuilder();
            foreach (Package p in site.Packages)
            {
                cards.Append("<div class=\"ct-pkg\"><img src=\"" + p.Image + "\" alt=\"\" loading=\"lazy\"><div class=\"ct-pkg-b\"><b>" + HtmlEncode(p.Name) + "</b><p>" + HtmlEncode(p.Text) + "</p><div class=\"ct-pkg-f\"><span><strong>" + Money(p.Price) + "</strong> per guest</span><button type=\"button\" class=\"ct-btn ct-btn-s\" onclick=\"CateringJs.pickPkg('" + p.Key + "')\">Quote this</button></div></div></div>");
                po.Append("<option value=\"" + p.Key + "\">" + HtmlEncode(p.Name) + " &middot; " + Money(p.Price) + "/guest</option>");
            }
            StringBuilder ad = new StringBuilder();
            foreach (CaterAddon a in site.CaterAddons)
            {
                ad.Append("<label class=\"ct-opt\"><input type=\"checkbox\" class=\"ct-cad\" value=\"" + a.Key + "\"><span>" + HtmlEncode(a.Label) + "<small>" + Money(a.Price) + " " + HtmlEncode(a.Unit) + "</small></span></label>");
            }
            HtmlDoc.HtmlBodyText = HtmlDoc.HtmlBodyText
                .Replace("{plhd_pkgs}", cards.ToString())
                .Replace("{plhd_pkgopts}", po.ToString())
                .Replace("{plhd_addons}", ad.ToString());
        }

        public async Task<ApiResponse> Quote()
        {
            ApiResponse response = new ApiResponse();
            SiteData site = await LoadSite();
            Package? p = site.Packages.FirstOrDefault(x => x.Key == (GetDataValue("pkg") ?? string.Empty).Trim());
            int guests;
            int.TryParse(GetDataValue("guests"), out guests);
            if (p == null || guests < 10 || guests > 300)
            {
                response.SetElementContents("ct-quote", "<div class=\"ct-quote-e\">" + (p == null ? "Choose a package first." : "Catering is for 10 to 300 guests.") + "</div>");
                return response;
            }
            List<string> adds = (GetDataValue("addons") ?? string.Empty).Split('.', StringSplitOptions.RemoveEmptyEntries).Distinct().ToList();
            List<KeyValuePair<string, decimal>> rows = new List<KeyValuePair<string, decimal>>
            {
                new KeyValuePair<string, decimal>(p.Name + " &times; " + guests + " guests", p.Price * guests)
            };
            decimal sub = p.Price * guests;
            foreach (CaterAddon a in site.CaterAddons.Where(a => adds.Contains(a.Key) && a.Key != "delivery"))
            {
                decimal v = a.Unit == "per guest" ? a.Price * guests : a.Price;
                rows.Add(new KeyValuePair<string, decimal>(HtmlEncode(a.Label) + (a.Unit == "per guest" ? " &times; " + guests : string.Empty), v));
                sub += v;
            }
            if (adds.Contains("delivery"))
            {
                decimal fee = sub > 300 ? 0 : site.CaterAddons.First(a => a.Key == "delivery").Price;
                rows.Add(new KeyValuePair<string, decimal>("Delivery" + (fee == 0 ? " (free over $300)" : string.Empty), fee));
                sub += fee;
            }
            decimal tax = Math.Round(sub * 0.075m, 2);
            decimal total = sub + tax;
            StringBuilder sb = new StringBuilder("<div class=\"ct-quote-h\"><span>Your estimate</span><b>" + Money(total) + "</b><small>about " + Money(Math.Round(total / guests, 2)) + " per guest</small></div><ul>");
            foreach (KeyValuePair<string, decimal> r in rows)
            {
                sb.Append("<li><span>" + r.Key + "</span><b>" + Money(r.Value) + "</b></li>");
            }
            sb.Append("<li><span>Tax (7.5%)</span><b>" + Money(tax) + "</b></li><li class=\"ct-quote-t\"><span>Total</span><b>" + Money(total) + "</b></li></ul>");
            sb.Append("<p>A 25% deposit (" + Money(Math.Round(total * 0.25m, 2)) + ") holds your date. Send the request below and our catering team will confirm.</p>");
            response.SetElementContents("ct-quote", sb.ToString());
            response.ExecuteScript("CateringJs.quoted('" + p.Key + "', " + guests + ");");
            return response;
        }

        public async Task<ApiResponse> Send()
        {
            ApiResponse response = new ApiResponse();
            SiteData site = await LoadSite();
            string name = (GetDataValue("name") ?? string.Empty).Trim();
            string email = (GetDataValue("email") ?? string.Empty).Trim();
            string phone = new string((GetDataValue("phone") ?? string.Empty).Where(char.IsDigit).ToArray());
            string date = (GetDataValue("date") ?? string.Empty).Trim();
            string pkg = (GetDataValue("pkg") ?? string.Empty).Trim();
            int guests;
            int.TryParse(GetDataValue("guests"), out guests);
            DateTime when;
            bool okDate = DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out when);

            string eName = name.Length < 2 || name.Length > 60 ? "Please tell us your name." : string.Empty;
            string eEmail = !IsEmail(email) ? "Please enter a valid email address." : string.Empty;
            string ePhone = phone.Length != 10 ? "Please enter a 10-digit phone number." : string.Empty;
            string eDate = !okDate ? "Please pick your event date." : when.Date < DateTime.Today.AddDays(3) ? "Catering needs at least 3 days&rsquo; notice." : when.Date > DateTime.Today.AddDays(365) ? "We book up to a year ahead." : string.Empty;
            string eGuests = guests < 10 || guests > 300 ? "Catering is for 10 to 300 guests." : string.Empty;
            string ePkg = !site.Packages.Any(p => p.Key == pkg) ? "Please choose a package." : string.Empty;

            response.SetElementContents("ct-e-name", eName);
            response.SetElementContents("ct-e-email", eEmail);
            response.SetElementContents("ct-e-phone", ePhone);
            response.SetElementContents("ct-e-date", eDate);
            response.SetElementContents("ct-e-guests", eGuests);
            response.SetElementContents("ct-e-pkg", ePkg);
            if (eName + eEmail + ePhone + eDate + eGuests + ePkg != string.Empty)
            {
                response.SetElementContents("ct-sent", string.Empty);
                return response;
            }
            Package pk = site.Packages.First(p => p.Key == pkg);
            response.SetElementContents("ct-sent", "<b>Request received, " + HtmlEncode(name) + "!</b> " + HtmlEncode(pk.Name) + " for " + guests + " guests on " + when.ToString("dddd, MMMM d", CultureInfo.InvariantCulture) + ". This is a demo form, so nothing was sent &mdash; but the request was checked on the server.");
            response.ExecuteScript("CateringJs.sent();");
            return response;
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
                sb.Append("<div class=\"ct-sg-none\">No results for &ldquo;" + HtmlEncode(q) + "&rdquo;</div>");
            }
            else
            {
                foreach (string r in rows.Take(7))
                {
                    sb.Append(r);
                }
                sb.Append("<div class=\"ct-sg-foot\">" + total + (total == 1 ? " result" : " results") + " across the menu, deals and stores</div>");
            }
            response.SetElementContents("ct-sugg", sb.ToString());
            response.ExecuteScript("CateringJs.openSugg();");
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
            response.ExecuteScript("CateringJs.setPromo('" + d.Code + "');");
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
                response.SetElementContents("ct-nl-msg", "<span class=\"ct-err\">Please enter a valid email address.</span>");
                return response;
            }
            response.SetElementContents("ct-nl-msg", "<span class=\"ct-ok\">You&rsquo;re in! Deals go to " + HtmlEncode(email) + ". (Demo only &mdash; nothing was stored.)</span>");
            response.ExecuteScript("CateringJs.subscribed();");
            return response;
        }

        private static void Toast(ApiResponse response, string html)
        {
            response.SetElementContents("ct-toast", html);
            response.ExecuteScript("CateringJs.toast();");
        }

        private static void SendCart(ApiResponse response, SiteData site, List<CartLine> cart)
        {
            decimal sub = cart.Sum(c => c.Unit * c.Qty);
            response.ExecuteScript("CateringJs.setCart('" + Serialize(cart) + "', " + cart.Sum(c => c.Qty) + ", '" + Money(sub) + "');");
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
            string pic = img == string.Empty ? "<span class=\"ct-sg-i\">&#9679;</span>" : "<img src=\"" + img + "\" alt=\"\">";
            return "<a class=\"ct-sg\" href=\"" + href + "\">" + pic + "<span><b>" + HtmlEncode(title) + "</b><small>" + type + " &middot; " + HtmlEncode(sub) + "</small></span></a>";
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
            sb.Append("<button type=\"button\" class=\"ct-chip" + (active == string.Empty ? " ct-act" : string.Empty) + "\" onclick=\"CateringJs.chip(this, '')\">All</button>");
            foreach (KeyLabel k in items)
            {
                sb.Append("<button type=\"button\" class=\"ct-chip" + (k.Key == active ? " ct-act" : string.Empty) + "\" onclick=\"CateringJs.chip(this, '" + k.Key + "')\">" + HtmlEncode(k.Label) + "</button>");
            }
            return sb.ToString();
        }

        private static string Badges(MenuItem i)
        {
            StringBuilder sb = new StringBuilder("<span class=\"ct-badges\">");
            if (i.Tags.Contains("popular"))
            {
                sb.Append("<span class=\"ct-bdg ct-bdg-p\">Popular</span>");
            }
            if (i.Tags.Contains("spicy"))
            {
                sb.Append("<span class=\"ct-bdg ct-bdg-s\">Spicy</span>");
            }
            if (i.Tags.Contains("veg"))
            {
                sb.Append("<span class=\"ct-bdg ct-bdg-v\">Veg</span>");
            }
            return sb.Append("</span>").ToString();
        }

        private static string ItemCards(SiteData site, List<MenuItem> list)
        {
            StringBuilder sb = new StringBuilder();
            foreach (MenuItem i in list)
            {
                sb.Append("<article class=\"ct-item\"><a class=\"ct-item-img\" href=\"Item?id=" + i.Id + "\"><img src=\"" + i.Image + "\" alt=\"" + HtmlEncode(i.Name) + "\" loading=\"lazy\">" + Badges(i) + "</a>");
                sb.Append("<div class=\"ct-item-b\"><h3><a href=\"Item?id=" + i.Id + "\">" + HtmlEncode(i.Name) + "</a></h3><p>" + HtmlEncode(i.Description) + "</p>");
                sb.Append("<div class=\"ct-item-f\"><span><b>" + Money(i.Price) + "</b><small>" + i.Calories + " cal</small></span><a class=\"ct-item-c\" href=\"Item?id=" + i.Id + "\">Customize</a><button type=\"button\" class=\"ct-add\" aria-label=\"Add " + HtmlEncode(i.Name) + "\" onclick=\"CateringJs.quick('" + i.Id + "')\">+ Add</button></div></div></article>");
            }
            return sb.ToString();
        }

        private static string ItemGrid(SiteData site, List<MenuItem> list)
        {
            return ItemCards(site, list);
        }

        private static string StoreCard(SiteData site, Store s)
        {
            return "<a class=\"ct-scard\" href=\"Locations\"><b>" + HtmlEncode(s.Name) + "</b><span>" + HtmlEncode(s.Address) + "</span><small>" + HtmlEncode(s.Hours) + "</small><em>" + string.Join(" &middot; ", s.Features.Take(3).Select(f => HtmlEncode(LabelOf(site.Features, f)))) + "</em></a>";
        }
    }
}
