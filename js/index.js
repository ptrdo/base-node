"use strict";
var comps = window.comps || {};
(function () {

  /**
   * Base Node
   * Demonstration of Common Service Calls
   *
   * @author psylwester(at)intven(dot)com
   * @version 1.00, 2017/03/18
   * @requires jQuery, Lodash
   *
   */

  comps.index = function () {

    /**
     * PRIVATE UTILITIES
     */

    /**
     * isJSON simple test of supposed JSON string
     *
     * @private
     * @param {String} str (required)
     * @returns {Boolean} true when parseable
     */
    var isJSON = function (str) {
      try {
        JSON.parse(str);
      } catch (e) {
        return false;
      }
      return true;
    };


    /**
     * parseNumericInput formulates raw input into well-formed array of numbers
     *
     * @private
     * @param {String} str (required) raw input[type=text].text();
     * @return {Array} of found numbers or [] when none
     */
    var parseNumericInputToList = function (str) {

      var result = [],
          proposed = str.split(/\s*,\s*|\s+/);

      console.log("proposed", proposed);

      proposed.forEach(function(val){
        if (/^-?\d+\.?\d*$/.test(val)) {
          result.push(Number(val));
        }
      });

      return result;
    };


    /**
     * PRIVATE HANDLERS
     */

    /**
     * doPost handles POST submission of a <form>
     *
     * @private
     * @param {Event} event
     * @returns asynchronous Request Response or Error
     */
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

    /**
     * doGet handles GET submission of a <form>
     *
     * @private
     * @param {Event} event
     * @returns asynchronous Request Response or Error
     */
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
     * doPut handles PUT submission of a <form>
     * NOTE: Currently utilized for demonstration of pseudo-POST to Python
     *
     * @private
     * @param {Event} event
     * @returns asynchronous Request Response or Error
     */
    var doPut = function(event) {

      event.preventDefault();

      var script = $("input[name=script]").val().trim();
      var input = $("input[name=input]").val().trim();
      var list = parseNumericInputToList(input);

      console.log(list);

      if (!_.isEmpty(script) && !_.isEmpty(list)) {
        $.ajax({
          url: "./api",
          type: "PUT",
          data: JSON.stringify({script:script,input:list}),
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

        comps.notifier.toast("Sorry, but those inputs seems wrong.", "warning");

      }
    };


    /**
     * PUBLIC MEMBERS (API)
     */

    return {

      init: function () {

        setTimeout(function () {

          document.getElementsByTagName("body")[0].classList.remove("unready");

          $("form#getter").on("submit", doGet);
          $("form#poster").on("submit", doPost);
          $("form#puter").on("submit", doPut);

          $("form > fieldset > a").on("click", function(event) {
            event.preventDefault();
            var form = $(event.target).closest("form").get(0);
            console.log(form, form.id);
            switch(form.id) {
              case "getter":
                $(form).find("input[type=text]:first").val("foo");
                $(form).find("input[type=text]:last").val("bar");
                break;
              case "poster":
                $(form).find("input[type=text]:first").val('{"foo":"bar"}');
                break;
              case "puter":
                $(form).find("input[type=text]:first").val("sum.py");
                $(form).find("input[type=text]:last")
                  .val("1, 2, 0.1415926")
                  .attr("pattern", "(-?\\d+\\.?\\d*,?\\s*)+")
                  .attr("title", "a sequence of of numbers separated by spaces and/or commas")
                break;
            }
          });

        }, 0);
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