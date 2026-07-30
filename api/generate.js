// api/generate.js
const { GoogleGenAI } = require("@google/genai"); // Gemini API SDK
const { Octokit } = require("@octokit/rest");   // GitHub操作用ライブラリ

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { idea } = req.body;
    if (!idea) {
        return res.status(400).json({ error: 'アイデアがありません' });
    }

    try {
        // 1. Gemini APIでゲームのHTMLコードを生成
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `
以下のアイデアを元に、スマホの縦画面で遊べる完全なHTML/CSS/JSの単一ファイルゲームを作成してください。
広告なし、超軽量で、スタイリッシュなダークモードのデザインにしてください。
余分な解説は一切含めず、純粋なHTMLコード（<!DOCTYPE html>から</html>まで）のみを出力してください。

アイデア: ${idea}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const gameHtml = response.text().trim().replace(/^```html/, '').replace(/```$/, '');
        
        // ファイル名用のスラッグを簡易生成（英数字）
        const fileName = `game_${Date.now()}.html`;
        const filePath = `games/${fileName}`;

        // 2. GitHub APIを使ってリポジトリにファイルを自動コミット
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const owner = process.env.GITHUB_OWNER; // あなたのGitHubユーザー名
        const repo = process.env.GITHUB_REPO;   // リポジトリ名

        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: `Add new game via AI agent: ${idea}`,
            content: Buffer.from(gameHtml).toString('base64'),
            branch: 'main',
        });

        return res.status(200).json({ 
            success: true, 
            message: `「${idea}」のゲームを作成し、デプロイしました！`,
            gameUrl: `games/${fileName}`
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'ゲームの生成またはデプロイに失敗しました。' });
    }
}