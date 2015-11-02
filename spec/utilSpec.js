"use strict"

var Util   = require("../lib/util.js");
var path   = require("path");
var fs     = require("fs");
var glob   = require("glob");
var assign = require("object-assign");

var DEFAULT_CONFIG_FILENAME = 'config.json';

describe("Util", function() {


  describe("readJSON", function(){
    var testConfig = path.join(__dirname, ".custom-config.json");

    beforeAll(function(){
      var json = {
        "label"       : "Barong Custom",
        "test_folder" : "spec"
      };

      Util.saveFile(testConfig, json);
    });

    afterAll(function(){
      fs.unlinkSync(testConfig);
    });

    it("can read JSON file", function(){
      var result   = Util.readJSON(testConfig);
      var expected = {
        "label"       : "Barong Custom",
        "test_folder" : "spec"
      };

      expect(result).toEqual(expected);
    });
  });

  describe("readBaseConfig", function(){
    var configJSON = {
      "label"       : "Barong Custom",
      "test_folder" : "spec"
    };
    var defaultJSON = {
      "test_folder" : "spec",
      "scenarios"   : []
    };

    beforeAll(function(){
      spyOn(Util, "readJSON").and.returnValue(configJSON);
      spyOn(Util, "defaults").and.returnValue(defaultJSON);
    });

    it("can read config file and extend from default params", function() {
      var result   = Util.readBaseConfig("/path/to/file.json");
      var expected = {
        "label"       : "Barong Custom",
        "test_folder" : "spec",
        "scenarios"   : []
      };

      expect(result).toEqual(expected);
    });
  });

  describe("slugify", function(){
    it("can convert given string to url-save characters", function(){
      var string   = "unicode ♥ is ☢";
      var result   = Util.slugify(string);
      var expected = "unicode-love-is-radioactive";

      expect(result).toEqual(expected);
    });
  });

  describe("generateFilename", function(){
    it("can generate the filename output based on scenario and captures label", function(){
      var scenarioLabel = "Home";
      var captureLabel  = "hover on News nav";
      var result        = Util.generateFilename(scenarioLabel, captureLabel);
      var expected      = "home__hover-on-news-nav";

      expect(result).toEqual(expected);
    });
  });

  describe("testFolder", function(){
    var fakeConfig = {"test_folder": "fake-config-liputan6"};

    beforeAll(function(){
      spyOn(Util, "readJSON").and.returnValue(fakeConfig);
    });

    it("return the test folder of given json file", function(){
      var result   = Util.testFolder("/fake.config.json");
      var expected = fakeConfig.test_folder;

      expect(result).toEqual(expected);
    });
  });

  describe("readDir", function(){
    var files = [
      "/path/home.json",
      "/path/category.json"
    ];

    beforeAll(function(){
      spyOn(glob, "sync").and.returnValue(files);
    });

    it("return list of test files in the given path", function(){
      var test_folder = "/liputan6";
      var result      = Util.readDir(test_folder);
      var expected    = files;

      expect(result).toEqual(expected);
    });
  });

  describe("getBaseConfigFile", function(){
    it("if default config file not found, return false",function(){
      spyOn(fs, 'existsSync').and.returnValue(false);

      var cwd      = "/some/path";
      var result   = Util.getBaseConfigFile(cwd);
      var expected = false;

      expect(result).toBe(expected);
    });

    it("if no configParams passed, return the default config file in current directory",function(){
      spyOn(fs, 'existsSync').and.returnValue(true);

      var cwd      = "/some/path";
      var result   = Util.getBaseConfigFile(cwd);
      var expected = path.join(cwd, DEFAULT_CONFIG_FILENAME);

      expect(result).toEqual(expected);
    });

    it("if single configParam provided, return the specified config file in current directory",function(){
      var cwd         = "/some/path";
      var configParam = "liputan6";
      var result      = Util.getBaseConfigFile(cwd, configParam);
      var expected    = path.join(cwd, configParam + '.json');

      expect(result).toEqual(expected);
    });

    it("if specific configParam provided, return the specified config file in current directory",function(){
      var cwd         = "/some/path";
      var configParam = "liputan6:home";
      var result      = Util.getBaseConfigFile(cwd, configParam);
      var expected    = path.join(cwd, 'liputan6.json');

      expect(result).toEqual(expected);
    });
  });

  describe("getTestsBaseFolder", function(){
    beforeAll(function(){
      spyOn(Util, "getBaseConfigFile").and.returnValue("/some/base/config.json");
      spyOn(Util, "testFolder").and.returnValue("test-folder");
    });

    it("return the base path of test file", function(){
      var configFile = Util.getBaseConfigFile();
      var result     = Util.getTestsBaseFolder(configFile);
      var testFolder = Util.testFolder(configFile);
      var expected   = path.join(path.dirname(configFile), testFolder);

      expect(result).toEqual(expected);
    });
  });

  describe("getConfigFiles", function(){
    var testFolder = "test-folder";

    beforeAll(function(){
      spyOn(Util, "getBaseConfigFile").and.returnValue('/some/path/liputan6.json');
      spyOn(Util, "getTestsBaseFolder").and.returnValue('/some/path/test-folder');
      spyOn(Util, "readDir").and.returnValue([
        "/some/path/test-folder/page1.json",
        "/some/path/test-folder/page2.json"
      ]);
    });

    it("can get the config files", function(){
      var cwd         = "/some/path";
      var configParam = "liputan6";
      var result      = Util.getConfigFiles(cwd, configParam);
      var expected    = {
        "base"  : "/some/path/liputan6.json",
        "tests" : [
          "/some/path/test-folder/page1.json",
          "/some/path/test-folder/page2.json"
        ]
      };
    });
  });

  describe("readConfig", function(){
    beforeAll(function(){
      spyOn(Util, "readBaseConfig").and.returnValue({
        "label"          : "Barong",
        "capture_target" : "bitmaps_test",
        "scenarios"      : []
      });

      spyOn(Util, "readJSON").and.returnValue({
        "label": "Some Page"
      });

    });

    it("can read array of config files", function(){
      var cwd   = "/local/path/";
      var files = {
        "base"  : "/default/path/base.json",
        "tests" : [
          "/default/path/test-folder/page.json"
        ]
      };

      var result     = Util.readConfig(cwd, files);
      var outputFile = Util.generateFilename("Barong", "Some Page");
      var outputPath = path.join(cwd, "bitmaps_test", outputFile + '.png');
      var expected   = {
        "label"          : "Barong",
        "capture_target" : "bitmaps_test",
        "scenarios"      : [
          {
            "label"       : "Some Page",
            "output_file" : outputPath
          }
        ]
      };

      expect(result).toEqual(expected);
    });
  });

  describe("saveFile", function(){
    var testSaveTarget = path.join(__dirname, ".test-config.json");

    afterAll(function(){
      fs.unlinkSync(testSaveTarget);
    });

    it("can save json config to file", function(){
      var source = {"test": 1};

      Util.saveFile(testSaveTarget, source);
      var readResult = Util.readJSON(testSaveTarget);

      expect(readResult).toEqual(source);
    });
  });

});
