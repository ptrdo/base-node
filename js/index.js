"use strict";
var comps = window.comps || {};
(function () {

  /**
   * Grid
   * Script Context, Title or Description
   *
   * @author psylwester(at)intven(dot)com
   * @version 1.00, 2017/03/09
   * @requires (framework)
   *
   */

  comps.index = function () {

    /**
     * PRIVATE MEMBERS
     *
     * @param  { String }  private_var    example only
     * @see
     *
     */

    var private_var;

    var isJSON = function (str) {
      try {
        JSON.parse(str);
      } catch (e) {
        return false;
      }
      return true;
    };

    var doPost = function (event) {

      event.preventDefault();

      var payload = $("input[name=payload]").val().trim();
      // payload["Info"] = [{"foo":"bar"}];

      if (isJSON(payload)) {
        $.ajax({
          url: "./api",
          type: "POST",
          data: JSON.stringify(JSON.parse(payload)),
          success: function (data) {
            var response = JSON.parse(data);
            console.log('success', response);
            $("output").text(JSON.stringify(response));
            comps.notifier.toast("A successful round-trip!", "success");
          },
          error: function (err) {
            console.log('error', err);
            $("output").text(err.message);
            comps.notifier.toast("Sorry, something went wrong!", "error");
          }
        });

      } else {

        comps.notifier.toast("Sorry, but that doesn't seem to be JSON!", "warning");

     }
    };

    var doGet = function(event) {

      event.preventDefault();

      var payload = {};
      var param = $("input[name=param]").val().trim();
      var value = $("input[name=value]").val().trim();

      if (!_.isEmpty(param) && !_.isEmpty(value)) {
        payload[param] = value;
        $.ajax({
          url: "./api",
          type: "GET",
          data: $.param(payload),
          success: function (data) {
            var response = data;
            console.log('success', response);
            $("output").text(response);
            comps.notifier.toast("A successful round-trip!", "success");
          },
          error: function (err) {
            console.log('error', err);
            $("output").text(err.message);
            comps.notifier.toast("Sorry, something went wrong!", "error");
          }
        });

      } else {

        comps.notifier.toast("Sorry, but that argument seems wrong.", "warning");

      }
    };


    /**
     * PRIVATE UTILITIES
     *
     */


    /**
     * PUBLIC MEMBERS
     *
     * @param
     *
     */

    return {

      init: function () {

        setTimeout(function () {

          document.getElementsByTagName("body")[0].classList.remove("unready");

          $("form#getter").on("submit", doGet);
          $("form#poster").on("submit", doPost);

        }, 0);
      },

      public_setter: function (val) {

        private_var = val;
      },

      public_getter: function () {

        return private_var;
      }
    };
  }();

  /**
   * LOAD PROGRAM
   *
   */

  try {

    if (window.hasOwnProperty("jQuery")) {

      $(document).ready(comps.index.init);

    } else if (window.hasOwnProperty("addEventListener")) {

      window.addEventListener("load", comps.index.init, false);

    } else if (window.hasOwnProperty("attachEvent")) {

      window.attachEvent("onload", comps.index.init);

    } else {

      window.comps.index.init();
    }
  }

  catch (e) {

    alert("error: " + e.status)
  }

})();

if (!console) {
  console = {
    log: function () {
      return;
    }
  };
}