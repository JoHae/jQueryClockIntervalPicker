module.exports = function(grunt) {
    'use strict';

    var jsFile = 'src/jquery.clockIntervalPicker.js';
    var cssFile = 'src/clockIntervalPicker.css';

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: jsFile,
                dest: 'build/<%= pkg.name %>.min.js'
            }
        },
        jshint: {
            src: [jsFile]
        },
        csslint: {
            src: [cssFile]
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-csslint');

    // Default task(s).
    grunt.registerTask('default', ['jshint', 'csslint', 'uglify']);
};