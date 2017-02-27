const fixtures = require('./../support/fixtures'),
  expect = require('chai').expect,
  shelljs = require('shelljs'),
  aProject = require('../test-utils').aProject;

const scripts = {
  test: 'echo | pwd | grep -o \'[^/]*$\' > tested',
  verify: 'echo | pwd | grep -o \'[^/]*$\' > verified'
};

describe('octo-run', function () {
  this.timeout(10000);

  it('should display help', () => {
    fixtures.project().inDir(ctx => {
      const out = ctx.octo('help run');

      expect(out).to.be.string('Usage: octo run');
    });
  });

  it('should display help if no sub-command is provided', () => {
    fixtures.project().inDir(ctx => {
      expect(() => ctx.octo('run')).to.throw('Usage: octo run');
    });
  });

  it('should allow execution from path within project', () => {
    fixtures.project().inDir(ctx => {
      ctx.module('a', module => {
        expect(() => module.octo('run')).to.throw('Usage: octo run');
      });
    });
  });

  ['npm', 'yarn'].forEach(engine => {
    it(`should run provided command with ${engine}`, () => {
      aProject(engine).inDir(ctx => {
        const out = ctx.octo('run -a test');

        expect(out).to.be.string('Executing \'octo run test\'');
        expect(out).to.be.string(`${engine} run test`);

        expect(ctx.readFile('a/tested')).to.equal('a\n');
        expect(ctx.readFile('b/tested')).to.equal('b\n');
        expect(ctx.readFile('c/tested')).to.equal('c\n');
      });
    });
  });

  it('should run in parallel', () => {
    aProject({scripts}).inDir(ctx => {
      const out = ctx.octo('run test verify -p');

      expect(out).to.be.string('Executing \'octo run test verify\'');

      expect(out).to.be.string('Starting module: a (a) (1/3)');
      expect(out).to.be.string('Finished module: a (a) (1/3)');
      expect(out).to.be.string('Starting module: b (b) (2/3)');
      expect(out).to.be.string('Finished module: b (b) (2/3)');
      expect(out).to.be.string('Starting module: c (c) (3/3)');
      expect(out).to.be.string('Finished module: c (c) (3/3)');


      expect(out).to.be.string('a: test');
      expect(out).to.be.string('a: verify');
      expect(ctx.readFile('a/tested')).to.equal('a\n');
      expect(ctx.readFile('a/verified')).to.equal('a\n');
    });
  });

  it('should run provided command modules with changes by default and mark modules as built', () => {
    aProject({scripts}).markBuilt().inDir(ctx => {
      ctx.exec('sleep 2; touch c/touch');
      const out = ctx.octo('run test');

      expect(out).to.be.string('Executing \'octo run test\'');

      expect(out).to.be.string('c (c) (1/1)');
      expect(out).to.not.be.string('a (a)');
      expect(out).to.not.be.string('b (b)');

      expect(shelljs.test('-f', 'a/tested')).to.equal(false);
      expect(shelljs.test('-f', 'b/tested')).to.equal(false);
      expect(ctx.readFile('c/tested')).to.equal('c\n');

      expect(ctx.octo('run test')).to.not.be.string('c (c) (1/1)');
    });
  });

  it('should run provided command and not mark module as built if -n is provided', () => {
    aProject({scripts}).inDir(ctx => {

      expect(ctx.octo('run -n test')).to.be.string('c (c) (3/3)');
      expect(ctx.octo('run test')).to.be.string('c (c) (3/3)');
    });
  });
  
  
  it('should run multiple commands', () => {
    aProject({scripts}).inDir(ctx => {
      const out = ctx.octo('run test verify');

      expect(out).to.be.string('Executing \'octo run test verify\'');

      expect(out).to.be.string('a (a) (1/3)');
      expect(out).to.be.string('b (b) (2/3)');
      expect(out).to.be.string('c (c) (3/3)');

      expect(ctx.readFile('a/tested')).to.equal('a\n');
      expect(ctx.readFile('b/tested')).to.equal('b\n');
      expect(ctx.readFile('c/tested')).to.equal('c\n');
      expect(ctx.readFile('a/verified')).to.equal('a\n');
      expect(ctx.readFile('b/verified')).to.equal('b\n');
      expect(ctx.readFile('c/verified')).to.equal('c\n');
    });
  });


  describe('-v verbose', () => {
    it('should display output from underlying commands', () => {
      aProject({scripts}).inDir(ctx => {
        const out = ctx.octo('run -v test');

        expect(out).to.be.string('c@1.1.0 test');
        expect(out).to.be.string('a (a) (1/3)');
        expect(ctx.readFile('a/tested')).to.equal('a\n');
      });
    });

    it.only('should display output from underlying commands in parallel -p mode', () => {
      aProject({scripts}).inDir(ctx => {
        const out = ctx.octo('run -v -p test');

        expect(out).to.be.string('c@1.1.0 test');
        expect(out).to.be.string('a (a) (1/3)');
        expect(ctx.readFile('a/tested')).to.equal('a\n');
      });
    });
  });

  it('should run command for all modules if -a is provided', () => {
    aProject({scripts}).markBuilt().inDir(ctx => {
      ctx.exec('sleep 2');
      expect(ctx.octo('run -n test')).to.be.string('no modules with changes');
      
      const out = ctx.octo('run -a test');

      expect(out).to.be.string('marking modules with changes as unbuilt');
      expect(out).to.be.string('Executing \'octo run test\'');

      expect(out).to.be.string('a (a) (1/3)');
      expect(out).to.be.string('b (b) (2/3)');
      expect(out).to.be.string('c (c) (3/3)');

      expect(ctx.readFile('a/tested')).to.equal('a\n');
      expect(ctx.readFile('b/tested')).to.equal('b\n');
      expect(ctx.readFile('c/tested')).to.equal('c\n');
    });
  });
});
