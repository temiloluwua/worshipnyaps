import UIKit
import WebKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }

        // Brand blue — must match the Capacitor splash and #app-splash in index.html
        // so there is zero visible difference between the native splash, the
        // HTML splash, and the raw WKWebView background before first paint.
        let brandBlue = UIColor(red: 38/255, green: 80/255, blue: 235/255, alpha: 1)

        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        guard let rootVC = storyboard.instantiateInitialViewController() else { return }
        rootVC.view.backgroundColor = brandBlue

        let window = UIWindow(windowScene: windowScene)
        window.backgroundColor = brandBlue
        window.rootViewController = rootVC
        window.makeKeyAndVisible()
        self.window = window

        // WKWebView is opaque white by default — even with the container view
        // set to blue, the WKWebView paints on top and shows white until the
        // first HTML paint. Set it to blue at the native layer so the cold-start
        // gap is invisible regardless of how long the web content takes to load.
        applyBlueBackground(to: rootVC.view, color: brandBlue)
    }

    // Walk the view hierarchy to find the WKWebView and neutralise its white
    // background. Called synchronously after makeKeyAndVisible() so the webview
    // already exists (CAPBridgeViewController sets it up in viewDidLoad).
    private func applyBlueBackground(to view: UIView, color: UIColor) {
        if let webView = view as? WKWebView {
            webView.isOpaque = false
            webView.backgroundColor = color
            webView.scrollView.backgroundColor = color
            return
        }
        view.subviews.forEach { applyBlueBackground(to: $0, color: color) }
    }

    func sceneDidDisconnect(_ scene: UIScene) {}

    func sceneDidBecomeActive(_ scene: UIScene) {}

    func sceneWillResignActive(_ scene: UIScene) {}

    func sceneWillEnterForeground(_ scene: UIScene) {}

    func sceneDidEnterBackground(_ scene: UIScene) {}

    // Deep-link / custom-scheme URLs opened while the app is already running.
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared,
                open: context.url,
                options: [:]
            )
        }
    }

    // Universal Links / NSUserActivity continuation while the app is running.
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
        )
    }
}
