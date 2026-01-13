
import React, { useState } from 'react';
import { HeartHandshake, Lock, Mail, ArrowRight, Loader2, Cloud, ShieldCheck, UserPlus, LogIn, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>('LOGIN');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validação simples de formato de e-mail
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getFirebaseErrorMessage = (error: any) => {
    const code = error.code;
    switch(code) {
        case 'auth/invalid-email': return 'E-mail inválido.';
        case 'auth/user-disabled': return 'Este usuário foi desativado.';
        case 'auth/user-not-found': return 'Usuário não encontrado.';
        case 'auth/wrong-password': return 'Senha incorreta.';
        case 'auth/email-already-in-use': return 'Este e-mail já está em uso.';
        case 'auth/weak-password': return 'A senha deve ter pelo menos 6 caracteres.';
        case 'auth/invalid-credential': return 'Credenciais inválidas.';
        default: return `Erro: ${error.message}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!email) {
        setErrorMsg('O campo e-mail é obrigatório.');
        setIsLoading(false);
        return;
    }

    if (!isValidEmail(email)) {
        setErrorMsg('Por favor, insira um endereço de e-mail válido.');
        setIsLoading(false);
        return;
    }

    try {
        if (mode === 'LOGIN') {
            if (!password) throw { code: 'auth/wrong-password', message: 'Senha vazia' };
            await signInWithEmailAndPassword(auth, email, password);
            // Redirection happens via onAuthStateChanged in App.tsx
        } else if (mode === 'REGISTER') {
            if (!password) throw { code: 'auth/weak-password', message: 'Senha vazia' };
            await createUserWithEmailAndPassword(auth, email, password);
            // Auto login happens
        } else if (mode === 'FORGOT') {
            await sendPasswordResetEmail(auth, email);
            setSuccessMsg(`Instruções enviadas para ${email}. Verifique seu e-mail.`);
            setIsLoading(false);
        }
    } catch (error: any) {
        console.error("Firebase Auth Error:", error);
        setErrorMsg(getFirebaseErrorMessage(error));
        setIsLoading(false);
    }
  };

  const switchMode = (newMode: 'LOGIN' | 'REGISTER' | 'FORGOT') => {
      setMode(newMode);
      setErrorMsg('');
      setSuccessMsg('');
      setPassword(''); 
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-br from-primary-700 to-primary-900 rounded-b-[40px] shadow-2xl z-0"></div>
      
      {/* Decorative Circles */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl z-0 pointer-events-none"></div>
      <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl z-0 pointer-events-none"></div>

      {/* Main Content Container */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative z-10 border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Header Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-white to-slate-50 p-4 rounded-2xl shadow-lg mb-4 flex items-center justify-center transform -rotate-3 border border-slate-100 ring-4 ring-white/50">
               <HeartHandshake className="text-primary-600 w-full h-full drop-shadow-sm" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">LifeCare</h1>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-1">
              <Cloud size={14} className="text-primary-400" /> Sistema Multiusuário
            </p>
          </div>

          {mode !== 'FORGOT' && (
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button 
                onClick={() => switchMode('LOGIN')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'LOGIN' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                type="button"
                >
                    <LogIn size={16} /> Entrar
                </button>
                <button 
                onClick={() => switchMode('REGISTER')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'REGISTER' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                type="button"
                >
                    <UserPlus size={16} /> Criar Conta
                </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-3 rounded-lg animate-in fade-in flex items-start gap-2">
                      <div className="mt-0.5"><ShieldCheck size={14}/></div>
                      {errorMsg}
                  </div>
              )}

              {successMsg && (
                  <div className="bg-green-50 border border-green-100 text-green-700 text-xs font-bold p-3 rounded-lg animate-in fade-in flex items-start gap-2">
                      <div className="mt-0.5"><CheckCircle2 size={14}/></div>
                      {successMsg}
                  </div>
              )}

              {mode === 'FORGOT' && (
                  <div className="text-center mb-4">
                      <h3 className="text-lg font-bold text-slate-800">Recuperar Acesso</h3>
                      <p className="text-xs text-slate-500 mt-1">Informe o e-mail da instituição para receber o link de redefinição.</p>
                  </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">E-mail da Instituição</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                  </div>
                  <input 
                    type="email" 
                    required
                    placeholder="admin@instituicao.com"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white focus:border-transparent transition-all outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {mode !== 'FORGOT' && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5 ml-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Senha</label>
                        {mode === 'LOGIN' && (
                            <button 
                                type="button"
                                onClick={() => switchMode('FORGOT')}
                                className="text-xs font-bold text-primary-600 hover:text-primary-800 hover:underline"
                            >
                                Esqueci a senha
                            </button>
                        )}
                    </div>
                    <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                    </div>
                    <input 
                        type="password" 
                        required
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white focus:border-transparent transition-all outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    </div>
                  </div>
              )}

              <button 
                type="submit"
                disabled={isLoading || (mode === 'FORGOT' && !!successMsg)}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                    <Loader2 className="animate-spin" /> 
                ) : mode === 'LOGIN' ? (
                    <>Acessar Painel <ArrowRight size={20} /></>
                ) : mode === 'REGISTER' ? (
                    <>Cadastrar Instituição <UserPlus size={20} /></>
                ) : (
                    <>Enviar Instruções <KeyRound size={20} /></>
                )}
              </button>
              
              {mode === 'FORGOT' && (
                  <button 
                    type="button"
                    onClick={() => switchMode('LOGIN')}
                    className="w-full text-slate-500 font-bold py-2 hover:text-primary-600 transition-colors flex items-center justify-center gap-2 text-sm mt-2"
                  >
                    <ArrowLeft size={16} /> Voltar para o Login
                  </button>
              )}
              
              {mode === 'REGISTER' && (
                  <p className="text-xs text-center text-slate-400 mt-2">
                      Ao criar uma conta, um novo banco de dados vazio será iniciado para sua instituição.
                  </p>
              )}
          </form>
          
          {/* Footer */}
          <div className="text-center space-y-1 mt-8 pt-4 border-t border-slate-50">
            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                <ShieldCheck size={12} /> Dados Isolados & Seguros
            </div>
            <p className="text-[10px] text-slate-300">&copy; {new Date().getFullYear()} LifeCare Systems. Cloud Ready.</p>
          </div>
      </div>
    </div>
  );
};
