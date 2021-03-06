var exec = require("child_process").exec;

// Package extension
var command = `tfx extension create --overrides-file ../configs/release.json --manifest-globs ./vss-extension-release.json --no-prompt --json --rev-version`;
exec(
    command,
    {
        cwd: "./dist"
    },
    (error, stdout) => {
        if (error) {
            console.error(`Could not create package: '${error}'`);
            return;
        }

        const output = JSON.parse(stdout);

        console.log(`Package created ${output.path}`);

        var command = `tfx extension publish --vsix ${output.path} --no-prompt`;
        exec(command, (error, stdout) => {
            if (error) {
                console.error(`Could not create package: '${error}'`);
                return;
            }

            console.log("Package published.");
        });
    }
);
