import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/menu.dart';
import '../viewmodels/auth_view_model.dart';
import 'theme.dart';

class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _busy = false;
  bool _hide = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final hasil = await context.read<AuthViewModel>().login(_email.text, _password.text);
    if (!mounted) return;
    switch (hasil) {
      case LoginOk():
        context.go(defaultPath);
      case LoginFail(:final error):
        setState(() {
          _error = error;
          _busy = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.bg,
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
                child: AutofillGroup(
                  child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const Row(children: [
                      Icon(Icons.storefront_outlined, color: AppColors.primary, size: 28),
                      SizedBox(width: 10),
                      Text('Klontonk Dashboard', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                    ]),
                    const SizedBox(height: 6),
                    const Text('Khusus admin platform.', style: TextStyle(color: AppColors.muted)),
                    const SizedBox(height: 22),
                    TextField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(labelText: 'Email'),
                      onSubmitted: (_) => _submit(),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _password,
                      obscureText: _hide,
                      autofillHints: const [AutofillHints.password],
                      decoration: InputDecoration(labelText: 'Password', suffixIcon: IconButton(icon: Icon(_hide ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 18), onPressed: () => setState(() => _hide = !_hide))),
                      onSubmitted: (_) => _submit(),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: const Color(0xFFFDE7E7), borderRadius: BorderRadius.circular(8)),
                        child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                      ),
                    ],
                    const SizedBox(height: 20),
                    FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? 'Memeriksa...' : 'Masuk')),
                  ]),
                ),
              ),
            ),
          ),
        ),
      );
}
