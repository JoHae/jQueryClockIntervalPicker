module.exports = function(grunt) {
    'use strict';

    var jsFile = 'src/jquery.clockIntervalPicker.js';
    var cssFile = 'src/clockIntervalPicker.css';
    var htmlExampleFile = 'example/index.html';

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
        },
        watch: {
            options: {
                spawn: false,
                livereload:true
            },
            files: [htmlExampleFile, jsFile, cssFile],
            tasks:['build']
        },
        connect: {
            server: {
                options: {
                    port: 9000,
                    base: {
                        path: '.',
                        options: {
                            index: 'example/index.html',
                            maxAge: 300000
                        }
                    },
                    hostname: 'localhost',
                    protocol: 'http',
                    livereload: true,
                    open: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-csslint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');

    // Default task(s).
    grunt.registerTask('build', ['jshint', 'csslint', 'uglify']);
    grunt.registerTask('server', ['connect','watch']);
    grunt.registerTask('default', ['build', 'server']);
};