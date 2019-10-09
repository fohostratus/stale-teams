"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const axios_1 = __importDefault(require("axios"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const args = getAndValidateArgs();
            const client = new github.GitHub(args.repoToken);
            yield processIssues(client, args);
        }
        catch (error) {
            core.error(error);
            core.setFailed(error.message);
        }
    });
}
function processIssues(client, args, page = 1) {
    return __awaiter(this, void 0, void 0, function* () {
        const issues = yield client.issues.listForRepo({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            state: 'open',
            per_page: 100,
            page: page
        });
        if (issues.data.length === 0) {
            return;
        }
        for (var issue of issues.data.values()) {
            core.debug(`found issue: ${issue.title} last updated ${issue.updated_at}`);
            let isPr = !!issue.pull_request;
            if (wasLastUpdatedBefore(issue, args.daysBeforeStale)) {
                sendTeams(issue, args.webhook);
            }
        }
        return yield processIssues(client, args, page + 1);
    });
}
function sendTeams(issue, webhook) {
    return __awaiter(this, void 0, void 0, function* () {
        const text = `Stale issue/pr found: ${issue.url}`;
        const body = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": "Stale Github Notification",
            "themeColor": "#FFDD00",
            "sections": [
                {
                    "activityTitle": "Github",
                    "activitySubtitle": "Stale Issues",
                    "activityImage": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
                    "text": text
                }
            ]
        };
        yield axios_1.default.post(webhook, body);
    });
}
function wasLastUpdatedBefore(issue, num_days) {
    return true;
    // const daysInMillis = 1000 * 60 * 60 * 24 * num_days;
    // const millisSinceLastUpdated =
    //   new Date().getTime() - new Date(issue.updated_at).getTime();
    // return millisSinceLastUpdated >= daysInMillis;
}
function getAndValidateArgs() {
    const args = {
        repoToken: core.getInput('repo-token', { required: true }),
        webhook: core.getInput('webhook', { required: true }),
        daysBeforeStale: parseInt(core.getInput('days-before-stale', { required: true }))
    };
    for (var numberInput of [
        'days-before-stale'
    ]) {
        if (isNaN(parseInt(core.getInput(numberInput)))) {
            throw Error(`input ${numberInput} did not parse to a valid integer`);
        }
    }
    return args;
}
run();
