module.exports = function(grunt) {
    'use strict';

    var srcFile = 'src/jquery.clockIntervalPicker.js';

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: srcFile,
                dest: 'build/<%= pkg.name %>.min.js'
            }
        },
        jshint: {
                src: [srcFile]
        },
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    // Default task(s).
    grunt.registerTask('default', ['jshint', 'uglify']);
};