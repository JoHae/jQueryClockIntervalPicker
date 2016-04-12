module.exports = function(grunt) {
    'use strict';

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            build: {
                files: {
                    'build/clockIntervalPicker.min.js': ['src/clockIntervalPicker.js']
                }
            }
        },
        jshint: {
            src: 'src/*.js'
        },
        csslint: {
            src: 'src/*.css'
        },
        cssmin: {
            target: {
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: ['*.css'],
                    dest: 'build',
                    ext: '.min.css'
                }]
            }
        },
        watch: {
            options: {
                spawn: false,
                livereload: true
            },
            files: ['example/*.html', 'src/*.js', 'src/*.css'],
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
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    // Default task(s).
    grunt.registerTask('build', ['jshint', 'csslint', 'cssmin', 'uglify']);
    grunt.registerTask('server', ['connect','watch']);
    grunt.registerTask('default', ['build', 'server']);
};