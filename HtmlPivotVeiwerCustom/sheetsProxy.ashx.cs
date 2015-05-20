using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;

namespace HtmlPivotVeiwerCustom
{
    /// <summary>
    /// Summary description for sheetsProxy
    /// </summary>
    public class sheetsProxy : IHttpHandler
    {

        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "text/csv";
            
            string key = context.Request.Params["key"];
            string gid = context.Request.Params["gid"] != null ? context.Request.Params["gid"] : "0";

            object sheetsCache = context.Cache["sheets-" + key];

            if (sheetsCache != null)
            {
                string cachedTweets = sheetsCache.ToString();

                context.Response.Write(cachedTweets);

                // We're done here.
                return;
            }
            
            WebClient googleSheets = new WebClient();
             
            // general?
            //https://docs.google.com/spreadsheet/pub?key=0Asxif6Jg1upydHp6WXMzZ3JFT2EyZU1mNElkM2VMOXc&single=true&gid=0&output=csv
      // download
            // https://docs.google.com/spreadsheets/d/1A3_NYGBfD8r8lGXZzwupNA1OZwld7dQdb0Gmd36_hEQ/export?format=csv&id=1A3_NYGBfD8r8lGXZzwupNA1OZwld7dQdb0Gmd36_hEQ&gid=486248522
       
            // ESMF sheet:
            //https://docs.google.com/spreadsheet/pub?key=0Asxif6Jg1upydDNscXp5TnljUU1FTGFhbGF5SXdXUGc&single=true&gid=0&output=csv
            
            // The base URL for Twitter API requests.
            string baseUrl = "https://docs.google.com/spreadsheet/pub?";
            
            // The specific API call that we're interested in.
            //string request = "statuses/user_timeline.json?id=Encosia";
            string request = String.Format("key={0}&output=csv&gid={1}", key, gid);



            // Make a request to the API and capture its result.
            string response = googleSheets.DownloadString(baseUrl + request);

            // Set the content-type so that libraries like jQuery can 
            //  automatically parse the result.

  //          context.Cache.Add("sheets", response,
  //null, DateTime.Now.AddMinutes(5),
  //System.Web.Caching.Cache.NoSlidingExpiration,
  //System.Web.Caching.CacheItemPriority.Normal,
  //null);

            // Relay the API response back down to the client.
            context.Response.Write(response);
        }

        public bool IsReusable
        {
            get
            {
                return false;
            }
        }
    }
}