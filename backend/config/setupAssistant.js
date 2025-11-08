import User from './models/User.js';

const createAIUser = async () => {
  const existing = await User.findOne({ username: 'smartbot' });
  if (!existing) {
    const aiUser = new User({
      username: 'smartbot',
      email: 'smart@artnexus.ai',
      role: 'assistant',
      profile: {
        displayName: 'S.M.A.R.T Assistant',
        avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png'
      },
      password: 'hashed-ai-password' // (You can skip login for this user)
    });
    await aiUser.save();
    console.log('🤖 AI Assistant created');
  }
};
createAIUser();
