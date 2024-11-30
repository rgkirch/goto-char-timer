const gulp = require('gulp');
const bump = require('gulp-bump');
const git = require('gulp-git');
const tag_version = require('gulp-tag-version');
const ts = require('gulp-typescript');
const PluginError = require('plugin-error');
const minimist = require('minimist');
const path = require('path');
const webpack = require('webpack');
const webpack_stream = require('webpack-stream');
const es = require('event-stream');

const webpack_config = require('./webpack.config.js');
const webpack_dev_config = require('./webpack.dev.js');

const releaseOptions = {
  semver: '',
};

function validateArgs(done) {
  const options = minimist(process.argv.slice(2), releaseOptions);
  if (!options.semver) {
    return done(
      new PluginError('updateVersion', {
        message: 'Missing `--semver` option. Possible values: patch, minor, major',
      }),
    );
  }
  if (!['patch', 'minor', 'major'].includes(options.semver)) {
    return done(
      new PluginError('updateVersion', {
        message: 'Invalid `--semver` option. Possible values: patch, minor, major',
      }),
    );
  }

  done();
}

function createGitTag() {
  return gulp.src(['./package.json']).pipe(tag_version());
}

function createGitCommit() {
  return gulp.src(['./package.json', './yarn.lock']).pipe(git.commit('bump version'));
}

function updateVersion(done) {
  var options = minimist(process.argv.slice(2), releaseOptions);

  return gulp
    .src(['./package.json', './yarn.lock'])
    .pipe(bump({ type: options.semver }))
    .pipe(gulp.dest('./'))
    .on('end', () => {
      done();
    });
}

function updatePath() {
  const input = es.through();
  const output = input.pipe(
    es.mapSync((f) => {
      const contents = f.contents.toString('utf8');
      const filePath = f.path;
      let platformRelativepath = path.relative(
        path.dirname(filePath),
        path.resolve(process.cwd(), 'out/src/platform/node'),
      );
      platformRelativepath = platformRelativepath.replace(/\\/g, '/');
      f.contents = Buffer.from(
        contents.replace(
          /\(\"platform\/([^"]*)\"\)/g,
          '("' + (platformRelativepath === '' ? './' : platformRelativepath + '/') + '$1")',
        ),
        'utf8',
      );
      return f;
    }),
  );
  return es.duplex(input, output);
}

function copyPackageJson() {
  return gulp.src('./package.json').pipe(gulp.dest('out'));
}

gulp.task('tsc', function () {
  var isError = false;

  var tsProject = ts.createProject('tsconfig.json', { noEmitOnError: true });
  var tsResult = tsProject
    .src()
    .pipe(tsProject())
    .on('error', () => {
      isError = true;
    })
    .on('finish', () => {
      isError && process.exit(1);
    });

  return tsResult.js.pipe(updatePath()).pipe(gulp.dest('out'));
});

gulp.task('webpack', function () {
  return webpack_stream(
    {
      config: webpack_config,
      entry: ['./src/extension.ts'],
    },
    webpack,
  ).pipe(gulp.dest('out'));
});

gulp.task('webpack-dev', function () {
  return webpack_stream(
    {
      config: webpack_dev_config,
      entry: ['./src/extension.ts'],
    },
    webpack,
  ).pipe(gulp.dest('out'));
});

gulp.task('commit-hash', function (done) {
  git.revParse({ args: 'HEAD', quiet: true }, function (err, hash) {
    require('fs').writeFileSync('out/version.txt', hash);
    done();
  });
});

gulp.task('build', gulp.series('webpack', 'commit-hash'));
gulp.task('build-dev', gulp.series('webpack-dev', 'commit-hash'));
gulp.task('prepare-test', gulp.parallel('tsc', copyPackageJson));
gulp.task('release', gulp.series(validateArgs, updateVersion, createGitCommit, createGitTag));
gulp.task('default', gulp.series('build'));