using System.Globalization;
using System.Text;
using System.Text.Json;
using FastFood.Models;
using SkyNet;

namespace FastFood.codes
{
    public class Home : WebPage
    {
        public override async Task OnInitialized()
        {
            HtmlDoc.SetTitle("Flamejack Burgers | Flame-grilled. Fast. Fair.");
            HtmlDoc.AddMetaElement("viewport", "width=device-width, initial-scale=1");
            HtmlDoc.AddMetaElement("description", "Flame-grilled burgers, crispy chicken, fresh fries and shakes. Order online for pickup or delivery.");

            SiteData site = await LoadSite();
            StringBuilder tiles = new StringBuilder();
            foreach (KeyLabel c in site.Categories)
            {
                MenuItem? first = site.Items.Where(i => i.Category == c.Key).OrderBy(i => i.Rank).FirstOrDefault();
                tiles.Append("<a class=\"hm-ctile\" href=\"Menu?cat=" + c.Key + "\"><img src=\"" + (first == null ? string.Empty : first.Image) + "\" alt=\"\" loading=\"lazy\"><b>" + HtmlEncode(c.Label) + "</b></a>");
            }
            Deal? deal = site.Deals.FirstOrDefault(d => d.Code == "FRYDAY") ?? site.Deals.FirstOrDefault();
            List<MenuItem> popular = site.Items.Where(i => i.Tags.Contains("popular")).OrderBy(i => i.Rank).Take(8).ToList();
            StringBuilder stores = new StringBuilder();
            foreach (Store s in site.Stores.Take(4))
            {
                stores.Append(StoreCard(site, s));
            }
            HtmlDoc.HtmlBodyText = HtmlDoc.HtmlBodyText
                .Replace("{plhd_tiles}", tiles.ToString())
                .Replace("{plhd_deal}", deal == null ? string.Empty : DealBand(deal))
                .Replace("{plhd_popular}", ItemGrid(site, popular))
                .Replace("{plhd_stores}", stores.ToString());
        }

        private static string DealBand(Deal d)
        {
            return "<div class=\"hm-dband\"><img src=\"" + d.Image + "\" alt=\"\"><div><div class=\"hm-eyebrow hm-eyebrow-l\">Today&rsquo;s deal &middot; " + HtmlEncode(d.When) + "</div><h2>" + HtmlEncode(d.Title) + "</h2><p>" + HtmlEncode(d.Text) + "</p></div>" +
                "<div class=\"hm-dband-a\"><span class=\"hm-code\">" + d.Code + "</span><button type=\"button\" class=\"hm-btn\" onclick=\"HomeJs.apply('" + d.Code + "')\">Use this deal</button></div></div>";
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
                sb.Append("<div class=\"hm-sg-none\">No results for &ldquo;" + HtmlEncode(q) + "&rdquo;</div>");
            }
            else
            {
                foreach (string r in rows.Take(7))
                {
                    sb.Append(r);
                }
                sb.Append("<div class=\"hm-sg-foot\">" + total + (total == 1 ? " result" : " results") + " across the menu, deals and stores</div>");
            }
            response.SetElementContents("hm-sugg", sb.ToString());
            response.ExecuteScript("HomeJs.openSugg();");
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
            response.ExecuteScript("HomeJs.setPromo('" + d.Code + "');");
            Toast(response, "Code <b>" + d.Code + "</b> is on your order: " + HtmlEncode(d.Title.ToLowerInvariant()) + ". <a href=\"Order\">Go to order &rarr;</a>");
            return response;
        }

        public async Task<ApiResponse> Subscribe()
        {
            ApiResponse response = new ApiResponse();
            
            string email = (GetDataValue("email") ?? string.Empty).Trim();
            if (!IsEmail(email))
            {
                response.SetElementContents("hm-nl-msg", "<span class=\"hm-err\">Please enter a valid email address.</span>");
                return response;
            }
            response.SetElementContents("hm-nl-msg", "<span class=\"hm-ok\">You&rsquo;re in! Deals go to " + HtmlEncode(email) + ". (Demo only &mdash; nothing was stored.)</span>");
            response.ExecuteScript("HomeJs.subscribed();");
            return response;
        }

        private static void Toast(ApiResponse response, string html)
        {
            response.SetElementContents("hm-toast", html);
            response.ExecuteScript("HomeJs.toast();");
        }

        private static void SendCart(ApiResponse response, SiteData site, List<CartLine> cart)
        {
            decimal sub = cart.Sum(c => c.Unit * c.Qty);
            response.ExecuteScript("HomeJs.setCart('" + Serialize(cart) + "', " + cart.Sum(c => c.Qty) + ", '" + Money(sub) + "');");
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
            string pic = img == string.Empty ? "<span class=\"hm-sg-i\">&#9679;</span>" : "<img src=\"" + img + "\" alt=\"\">";
            return "<a class=\"hm-sg\" href=\"" + href + "\">" + pic + "<span><b>" + HtmlEncode(title) + "</b><small>" + type + " &middot; " + HtmlEncode(sub) + "</small></span></a>";
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
            sb.Append("<button type=\"button\" class=\"hm-chip" + (active == string.Empty ? " hm-act" : string.Empty) + "\" onclick=\"HomeJs.chip(this, '')\">All</button>");
            foreach (KeyLabel k in items)
            {
                sb.Append("<button type=\"button\" class=\"hm-chip" + (k.Key == active ? " hm-act" : string.Empty) + "\" onclick=\"HomeJs.chip(this, '" + k.Key + "')\">" + HtmlEncode(k.Label) + "</button>");
            }
            return sb.ToString();
        }

        private static string Badges(MenuItem i)
        {
            StringBuilder sb = new StringBuilder("<span class=\"hm-badges\">");
            if (i.Tags.Contains("popular"))
            {
                sb.Append("<span class=\"hm-bdg hm-bdg-p\">Popular</span>");
            }
            if (i.Tags.Contains("spicy"))
            {
                sb.Append("<span class=\"hm-bdg hm-bdg-s\">Spicy</span>");
            }
            if (i.Tags.Contains("veg"))
            {
                sb.Append("<span class=\"hm-bdg hm-bdg-v\">Veg</span>");
            }
            return sb.Append("</span>").ToString();
        }

        private static string ItemCards(SiteData site, List<MenuItem> list)
        {
            StringBuilder sb = new StringBuilder();
            foreach (MenuItem i in list)
            {
                sb.Append("<article class=\"hm-item\"><a class=\"hm-item-img\" href=\"Item?id=" + i.Id + "\"><img src=\"" + i.Image + "\" alt=\"" + HtmlEncode(i.Name) + "\" loading=\"lazy\">" + Badges(i) + "</a>");
                sb.Append("<div class=\"hm-item-b\"><h3><a href=\"Item?id=" + i.Id + "\">" + HtmlEncode(i.Name) + "</a></h3><p>" + HtmlEncode(i.Description) + "</p>");
                sb.Append("<div class=\"hm-item-f\"><span><b>" + Money(i.Price) + "</b><small>" + i.Calories + " cal</small></span><a class=\"hm-item-c\" href=\"Item?id=" + i.Id + "\">Customize</a><button type=\"button\" class=\"hm-add\" aria-label=\"Add " + HtmlEncode(i.Name) + "\" onclick=\"HomeJs.quick('" + i.Id + "')\">+ Add</button></div></div></article>");
            }
            return sb.ToString();
        }

        private static string ItemGrid(SiteData site, List<MenuItem> list)
        {
            return ItemCards(site, list);
        }

        private static string StoreCard(SiteData site, Store s)
        {
            return "<a class=\"hm-scard\" href=\"Locations\"><b>" + HtmlEncode(s.Name) + "</b><span>" + HtmlEncode(s.Address) + "</span><small>" + HtmlEncode(s.Hours) + "</small><em>" + string.Join(" &middot; ", s.Features.Take(3).Select(f => HtmlEncode(LabelOf(site.Features, f)))) + "</em></a>";
        }
    }
}
